export const roadFreightCarrier = {
  id: 'road-freight',
  name: 'Road Freight',
  async getQuote(): Promise<never> { throw new Error('Road freight partner integration is planned for a future release.') },
  // TODO: Add carrier tendering and groupage schedule integrations.
}
