export default function HomePage() {
  return (
    <main>
      <h1>OCC Clockwork Wizards — Minimal V1 API</h1>
      <p>Use API routes only:</p>
      <ul>
        <li>POST /api/jobs/daily-products</li>
        <li>POST /api/jobs/daily-posts</li>
        <li>GET /api/products/latest</li>
        <li>GET /api/products/recent</li>
        <li>GET /api/posts/recent</li>
      </ul>
    </main>
  );
}
