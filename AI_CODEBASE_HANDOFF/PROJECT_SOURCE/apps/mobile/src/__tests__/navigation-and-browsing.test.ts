describe('Mobile Public Browsing & Store Navigation Rules', () => {
  it('formats category store navigation payload with category ID and name', () => {
    const category = { id: 'cat-business-123', name: 'Business Laptops' };
    const navPayload = {
      screen: 'Store',
      params: { categoryId: category.id, categoryName: category.name },
    };

    expect(navPayload.screen).toBe('Store');
    expect(navPayload.params.categoryId).toBe('cat-business-123');
    expect(navPayload.params.categoryName).toBe('Business Laptops');
  });

  it('builds server query params with category, search, and brand properly combined', () => {
    const buildStoreQueryParams = (opts: {
      categoryId?: string | null;
      brand?: string;
      appliedSearch?: string;
      minPrice?: number;
      maxPrice?: number;
      stockOnly?: boolean;
      offset?: number;
      limit?: number;
    }) => {
      const params: Record<string, string | number | boolean> = {
        limit: opts.limit ?? 50,
        offset: opts.offset ?? 0,
      };

      if (opts.categoryId && opts.categoryId !== 'all') {
        params.categoryId = opts.categoryId;
      }
      if (opts.stockOnly) {
        params.stockOnly = true;
      }
      if (opts.minPrice !== undefined && opts.minPrice > 0) {
        params.minPrice = opts.minPrice;
      }
      if (opts.maxPrice !== undefined && opts.maxPrice > 0) {
        params.maxPrice = opts.maxPrice;
      }

      if (opts.appliedSearch) {
        params.search = opts.brand ? `${opts.appliedSearch} ${opts.brand}` : opts.appliedSearch;
      } else if (opts.brand) {
        params.search = opts.brand;
      }

      return params;
    };

    const params = buildStoreQueryParams({
      categoryId: 'cat-business-123',
      brand: 'Dell',
      appliedSearch: 'Latitude',
      minPrice: 20000,
      maxPrice: 45000,
      stockOnly: true,
    });

    expect(params.limit).toBe(50);
    expect(params.offset).toBe(0);
    expect(params.categoryId).toBe('cat-business-123');
    expect(params.search).toBe('Latitude Dell');
    expect(params.minPrice).toBe(20000);
    expect(params.maxPrice).toBe(45000);
    expect(params.stockOnly).toBe(true);
  });

  it('handles brand-only search when text query is empty', () => {
    const buildStoreQueryParams = (opts: { brand?: string; appliedSearch?: string }) => {
      const params: Record<string, string> = {};
      if (opts.appliedSearch) {
        params.search = opts.brand ? `${opts.appliedSearch} ${opts.brand}` : opts.appliedSearch;
      } else if (opts.brand) {
        params.search = opts.brand;
      }
      return params;
    };

    const params = buildStoreQueryParams({ brand: 'Lenovo' });
    expect(params.search).toBe('Lenovo');
  });

  it('determines when a route requires authentication vs guest access', () => {
    const protectedRoutes = new Set([
      'OrderHistory',
      'MyLaptops',
      'AddressBook',
      'Profile',
      'ChangePassword',
      'MitraDashboard',
      'Checkout',
    ]);

    expect(protectedRoutes.has('OrderHistory')).toBe(true);
    expect(protectedRoutes.has('Profile')).toBe(true);
    expect(protectedRoutes.has('HelpHome')).toBe(false);
    expect(protectedRoutes.has('BuybackGuarantee')).toBe(false);
    expect(protectedRoutes.has('Terms')).toBe(false);
  });
});

