import { useEffect, useMemo, useRef, useState } from "react";

function normalizeItems(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function TypeaheadInput({
  value,
  onChange,
  onSelect,
  onQuery,
  suggestions = [],
  placeholder,
  className = "",
  inputClassName = "",
  minChars = 2,
  hint,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef(null);

  const items = useMemo(() => normalizeItems(suggestions), [suggestions]);

  useEffect(() => {
    function handleOutside(event) {
      if (!boxRef.current || boxRef.current.contains(event.target)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const shouldOpen = value?.trim()?.length >= minChars && items.length > 0;

  useEffect(() => {
    if (!shouldOpen) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    setOpen(true);
  }, [shouldOpen]);

  const handleKeyDown = (event) => {
    if (!open || !items.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      onSelect(items[activeIndex]);
      setOpen(false);
      setActiveIndex(-1);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue);
          onQuery?.(nextValue);
        }}
        onFocus={() => {
          if (shouldOpen) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        aria-autocomplete="list"
        role="combobox"
        aria-expanded={open}
      />
      {open && items.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {items.map((item, index) => (
            <button
              key={`${item}-${index}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect(item);
                setOpen(false);
                setActiveIndex(-1);
              }}
              className={`block w-full px-3 py-2 text-left text-sm ${
                index === activeIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}

function getLastToken(value = "") {
  const tokens = value.split(",");
  return tokens[tokens.length - 1]?.trim() || "";
}

function replaceLastToken(value = "", nextToken = "") {
  const tokens = value.split(",");
  tokens[tokens.length - 1] = ` ${nextToken}`;
  return tokens
    .join(",")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

export function TagTypeaheadInput({
  value,
  onChange,
  onSelect,
  onQuery,
  suggestions = [],
  placeholder,
  inputClassName = "",
  minChars = 1,
  hint,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef(null);
  const token = getLastToken(value);

  const items = useMemo(() => normalizeItems(suggestions), [suggestions]);

  useEffect(() => {
    function handleOutside(event) {
      if (!boxRef.current || boxRef.current.contains(event.target)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const shouldOpen = token.length >= minChars && items.length > 0;

  useEffect(() => {
    if (!shouldOpen) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    setOpen(true);
  }, [shouldOpen]);

  const selectItem = (item) => {
    const nextValue = replaceLastToken(value, item);
    onChange(nextValue);
    onSelect?.(nextValue);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue);
          onQuery?.(getLastToken(nextValue));
        }}
        onFocus={() => {
          if (shouldOpen) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open || !items.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((prev) => (prev + 1) % items.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            selectItem(items[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        placeholder={placeholder}
        className={inputClassName}
        aria-autocomplete="list"
        role="combobox"
        aria-expanded={open}
      />
      {open && items.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {items.map((item, index) => (
            <button
              key={`${item}-${index}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectItem(item)}
              className={`block w-full px-3 py-2 text-left text-sm ${
                index === activeIndex ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
