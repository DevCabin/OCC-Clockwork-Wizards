declare module 'amazon-paapi' {
  interface CommonParameters {
    AccessKey: string;
    SecretKey: string;
    PartnerTag: string;
    PartnerType: string;
    Marketplace: string;
  }

  interface SearchRequestParameters {
    Keywords: string;
    SearchIndex?: string;
    ItemPage?: number;
    Resources?: string[];
  }

  interface GetItemsRequestParameters {
    ItemIds: string[];
    Resources?: string[];
  }

  interface SearchResult {
    Items?: Array<{
      ASIN: string;
      ItemInfo?: {
        Title?: {
          DisplayValue: string;
        };
        Features?: {
          DisplayValues: string[];
        };
      };
      Images?: {
        Primary?: {
          Large?: {
            URL: string;
          };
        };
      };
      Offers?: {
        Listings?: Array<{
          Price?: {
            DisplayAmount: string;
          };
        }>;
      };
    }>;
  }

  interface GetItemsResult {
    Items?: Array<{
      ASIN: string;
      ItemInfo?: {
        Title?: {
          DisplayValue: string;
        };
        Features?: {
          DisplayValues: string[];
        };
      };
      Images?: {
        Primary?: {
          Large?: {
            URL: string;
          };
        };
      };
      Offers?: {
        Listings?: Array<{
          Price?: {
            DisplayAmount: string;
          };
        }>;
      };
    }>;
  }

  export function SearchItems(
    commonParameters: CommonParameters,
    requestParameters: SearchRequestParameters
  ): Promise<{ SearchResult?: SearchResult }>;

  export function GetItems(
    commonParameters: CommonParameters,
    requestParameters: GetItemsRequestParameters
  ): Promise<{ ItemsResult?: GetItemsResult }>;

  export default {
    SearchItems,
    GetItems,
  };
}
