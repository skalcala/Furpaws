import { forwardRef } from "react";
import { InputNumber } from "antd";
// All clinic numeric fields are non-negative; free text and exponent notation are blocked.
export default forwardRef(function NumericInput(
  { precision, onKeyDown, onPaste, ...props },
  ref,
) {
  const allowed = precision === 0 ? /^\d*$/ : /^\d*(\.\d*)?$/;
  return (
    <InputNumber
      {...props}
      ref={ref}
      precision={precision}
      inputMode={precision === 0 ? "numeric" : "decimal"}
      parser={(value) =>
        String(value || "").replace(precision === 0 ? /\D/g : /[^\d.]/g, "")
      }
      onKeyDown={(event) => {
        if (
          !event.ctrlKey &&
          !event.metaKey &&
          event.key.length === 1 &&
          !/[0-9.]/.test(event.key)
        )
          event.preventDefault();
        if (precision === 0 && event.key === ".") event.preventDefault();
        onKeyDown?.(event);
      }}
      onPaste={(event) => {
        if (!allowed.test(event.clipboardData.getData("text").trim()))
          event.preventDefault();
        onPaste?.(event);
      }}
    />
  );
});
