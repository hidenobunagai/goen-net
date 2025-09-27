/// <reference types="vite/client" />

declare global {
	// Google Identity Services minimal typings
	interface GsiCredentialResponse {
		credential: string;
		select_by?: string;
		clientId?: string;
	}

	interface GsiIdAPI {
		initialize(options: { client_id: string; callback: (response: GsiCredentialResponse) => void }): void;
		renderButton(parent: HTMLElement, options?: Record<string, unknown>): void;
		prompt(): void;
	}

	interface GsiAccountsAPI {
		id: GsiIdAPI;
	}

	interface GoogleGlobal {
		accounts: GsiAccountsAPI;
	}

	interface Window {
		google?: GoogleGlobal;
	}

	interface ImportMetaEnv {
		readonly VITE_GOOGLE_CLIENT_ID?: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export { };

