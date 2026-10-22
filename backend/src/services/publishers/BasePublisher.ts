import { PostDraft, PostTarget, MediaAsset, ConnectedAccount } from '../../db.js';

export interface PublishContext {
  draft: PostDraft;
  target: PostTarget;
  media?: MediaAsset;
  account?: ConnectedAccount;
}

export interface PublishResult {
  success: boolean;
  externalPostId?: string;
  externalUrl?: string;
  rawResponse: any;
  error?: string;
}

export abstract class BasePublisher {
  abstract platformName: string;

  /**
   * Main publishing method. Should check feature flags and branch to real API or mock simulation.
   */
  abstract publish(context: PublishContext): Promise<PublishResult>;
}
