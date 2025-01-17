export type HTMLElementEvent<T extends HTMLInputElement> = Omit<
  Event,
  "currentTarget"
> & {
  srcElement: HTMLInputElement;
  currentTarget: (EventTarget & { value?: T["value"] }) | null;
};

export type ServerError = { success: boolean; code: string; message: string };
