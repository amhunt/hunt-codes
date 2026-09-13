import React, { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;
export const ModalClose = Dialog.Close;
export const ModalTitle = Dialog.Title;
export const ModalDescription = Dialog.Description;

/** Unstyled modal surface. Radix owns focus containment, dismissal and scroll
 * locking; callers supply layout classes, a title, and a close control.
 * Supports programmatic openers without a ModalTrigger, including 3D links.
 */
export const ModalContent = ({
  children,
  overlayClassName,
  initialFocusRef,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof Dialog.Content> & {
  overlayClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) => {
  const openerRef = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Portal>
      <Dialog.Overlay className={overlayClassName}>
        <Dialog.Content
          {...props}
          onOpenAutoFocus={(event) => {
            openerRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            onOpenAutoFocus?.(event);
            if (!event.defaultPrevented && initialFocusRef?.current) {
              event.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            if (!event.defaultPrevented && openerRef.current?.isConnected) {
              event.preventDefault();
              openerRef.current.focus();
            }
          }}
        >
          {children}
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Portal>
  );
};
