export type Owner = { id: string; email: string };

export interface OwnerAuth {
  sendMagicLink(email: string, redirectTo: string): Promise<void>;
  completeLogin(params: URLSearchParams): Promise<Owner | null>;
  getOwner(headers: Headers): Promise<Owner | null>;
  signOut(headers: Headers): Promise<void>;
}
