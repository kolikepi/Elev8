export const dhlCarrier = {
  id: 'dhl',
  name: 'DHL Express',
  async getQuote(): Promise<never> { throw new Error('DHL API integration is planned for a future release.') },
  // TODO: Add DHL MyDHL API integration.
}
