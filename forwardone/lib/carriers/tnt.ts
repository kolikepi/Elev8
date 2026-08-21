export const tntCarrier = {
  id: 'tnt',
  name: 'TNT',
  async getQuote(): Promise<never> { throw new Error('TNT API integration is planned for a future release.') },
  // TODO: Add TNT Economy and Express rate integration.
}
