import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response:message';
export const SKIP_ENVELOPE_KEY = 'response:skip-envelope';

/** Overrides the default `"Success"` message in the response envelope. */
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);

/** Returns the handler value untouched — used by file downloads and PDF streams. */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
