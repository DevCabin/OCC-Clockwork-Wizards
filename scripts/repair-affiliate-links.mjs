#!/usr/bin/env node

/**
 * Repair Legacy WordPress Post Affiliate Links
 * 
 * Problem: Some imported WordPress posts have nerdymugs.com URLs instead of Amazon affiliate links
 * Solution: Use source imported-posts.json to update OCC database with correct Amazon URLs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairAffiliateLinks(dryRun = true) {
  console.log(`\n🔧 Affiliate Link Repair Script`);
  console.log(`Mode: ${dryRun ? '🧪 DRY RUN' : '⚡ LIVE UPDATE'}\n`);

  // Step 1: Load source data
  console.log('📂 Loading source WordPress data...');
  const sourceDataUrl = 'https://raw.githubusercontent.com/DevCabin/NerdyMugs-The-Machine/main/app/imported-posts.json';
  
  let sourceData;
  try {
    const response = await fetch(sourceDataUrl);
    sourceData = await response.json();
    console.log(`✅ Loaded ${sourceData.length} source records\n`);
  } catch (error) {
    console.error('❌ Failed to load source data:', error.message);
    process.exit(1);
  }

  // Step 2: Query all legacy WordPress posts from OCC
  console.log('📊 Querying OCC database for legacy posts...');
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, slug, product_url, content_source, product_id')
    .eq('content_source', 'wordpress-import');

  if (error) {
    console.error('❌ Database query failed:', error.message);
    process.exit(1);
  }

  console.log(`✅ Found ${posts.length} imported posts\n`);

  // Step 3: Build lookup map from source data
  const sourceMap = new Map();
  sourceData.forEach(item => {
    if (item.title && item.amazonUrl) {
      // Normalize title for matching
      const normalizedTitle = item.title.trim().toLowerCase();
      sourceMap.set(normalizedTitle, item.amazonUrl);
    }
  });

  console.log(`📍 Built source map with ${sourceMap.size} Amazon URLs\n`);

  // Step 4: Identify posts that need repair
  const needsRepair = [];
  const alreadyGood = [];
  const noSourceUrl = [];

  for (const post of posts) {
    const normalizedTitle = post.title.trim().toLowerCase();
    const sourceUrl = sourceMap.get(normalizedTitle);

    if (post.product_url && post.product_url.includes('nerdymugs.com')) {
      if (sourceUrl && sourceUrl.includes('amazon')) {
        needsRepair.push({
          id: post.id,
          title: post.title,
          slug: post.slug,
          currentUrl: post.product_url,
          newUrl: sourceUrl,
          product_id: post.product_id
        });
      } else {
        noSourceUrl.push({
          title: post.title,
          currentUrl: post.product_url
        });
      }
    } else if (post.product_url && post.product_url.includes('amazon')) {
      alreadyGood.push(post.title);
    }
  }

  // Step 5: Report findings
  console.log('📊 REPAIR ANALYSIS:');
  console.log(`   ✅ Already have Amazon URLs: ${alreadyGood.length}`);
  console.log(`   🔧 Need repair (have source URL): ${needsRepair.length}`);
  console.log(`   ⚠️  Need repair (no source URL): ${noSourceUrl.length}`);
  console.log('');

  if (needsRepair.length > 0) {
    console.log('🔧 Posts to repair:');
    needsRepair.slice(0, 10).forEach(post => {
      console.log(`   • "${post.title}"`);
      console.log(`     FROM: ${post.currentUrl}`);
      console.log(`     TO:   ${post.newUrl}\n`);
    });
    if (needsRepair.length > 10) {
      console.log(`   ... and ${needsRepair.length - 10} more\n`);
    }
  }

  if (noSourceUrl.length > 0 && noSourceUrl.length <= 10) {
    console.log('⚠️  Posts without source Amazon URL (will need manual fix):');
    noSourceUrl.forEach(post => {
      console.log(`   • "${post.title}"`);
      console.log(`     Current: ${post.currentUrl}\n`);
    });
  } else if (noSourceUrl.length > 10) {
    console.log(`⚠️  ${noSourceUrl.length} posts need manual Amazon URL (no source data)\n`);
  }

  // Step 6: Execute repairs
  if (!dryRun && needsRepair.length > 0) {
    console.log('\n⚡ EXECUTING REPAIRS...\n');
    
    let successCount = 0;
    let failCount = 0;

    for (const repair of needsRepair) {
      // Update both posts and products tables
      const { error: postError } = await supabase
        .from('posts')
        .update({ product_url: repair.newUrl })
        .eq('id', repair.id);

      if (postError) {
        console.error(`❌ Failed to update post "${repair.title}":`, postError.message);
        failCount++;
        continue;
      }

      // Also update the product record if it exists
      if (repair.product_id) {
        const { error: productError } = await supabase
          .from('products')
          .update({ product_url: repair.newUrl })
          .eq('id', repair.product_id);

        if (productError) {
          console.warn(`⚠️  Updated post but failed to update product for "${repair.title}"`);
        }
      }

      successCount++;
      if (successCount % 10 === 0) {
        console.log(`   ✅ Updated ${successCount}/${needsRepair.length}...`);
      }
    }

    console.log(`\n✅ Repair complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
  } else if (dryRun) {
    console.log('\n🧪 DRY RUN - No changes made');
    console.log('   Run with --live flag to execute repairs\n');
  } else {
    console.log('\n✅ No repairs needed!\n');
  }

  // Step 7: Summary
  return {
    total: posts.length,
    alreadyGood: alreadyGood.length,
    repaired: dryRun ? 0 : needsRepair.length,
    needsManual: noSourceUrl.length,
    dryRun
  };
}

// Parse command line args
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

repairAffiliateLinks(dryRun)
  .then(summary => {
    console.log('\n📋 FINAL SUMMARY:');
    console.log(`   Total legacy posts: ${summary.total}`);
    console.log(`   Already correct: ${summary.alreadyGood}`);
    console.log(`   ${summary.dryRun ? 'Would repair' : 'Repaired'}: ${summary.dryRun ? summary.total - summary.alreadyGood - summary.needsManual : summary.repaired}`);
    console.log(`   Needs manual fix: ${summary.needsManual}\n`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
