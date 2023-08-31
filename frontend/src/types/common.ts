import { ComponentChildren, JSX } from "preact";

export type ComponentWithProps<TProps extends {}> = (props : TProps) => JSX.Element
export type HOCProvider = ComponentWithProps<{ children : ComponentChildren}>;