export const fedexCarrier = {
  id: 'fedex',
  name: 'FedEx Express',
  async getQuote(): Promise<never> { throw new Error('FedEx API integration is planned for a future release.') },
  // TODO: Add authenticated FedEx Rates and Ship API integration.
}
