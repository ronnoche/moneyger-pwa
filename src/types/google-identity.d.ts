interface GoogleIdentityCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleIdentityWindow {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleIdentityCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          type?: 'standard' | 'icon';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
          logo_alignment?: 'left' | 'center';
          width?: string | number;
        },
      ) => void;
      prompt: () => void;
      disableAutoSelect: () => void;
    };
  };
}

interface Window {
  google?: GoogleIdentityWindow;
}
