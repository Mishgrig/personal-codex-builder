import { useLayoutEffect, useRef } from "react";
import type { TextareaHTMLAttributes } from "react";

export function AutoResizeTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    element.style.height = "0px";
    element.style.height = `${Math.max(element.scrollHeight, 48)}px`;
  }, [props.value]);

  return <textarea {...props} ref={ref} />;
}
