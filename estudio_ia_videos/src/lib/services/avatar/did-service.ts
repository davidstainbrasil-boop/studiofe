import { DIDServiceReal } from './did-service-real';

let cachedService: DIDServiceReal | null = null;

export function getDIDService(): DIDServiceReal {
    if (!process.env.DID_API_KEY) {
        throw new Error('DID_API_KEY not configured');
    }
    if (!cachedService) {
        cachedService = new DIDServiceReal();
    }
    return cachedService;
}
