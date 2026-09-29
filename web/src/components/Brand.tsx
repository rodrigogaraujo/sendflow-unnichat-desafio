import { Send } from "lucide-react";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-symbol">
        <Send size={22} strokeWidth={2.2} />
      </span>
      <span>
        broadcast<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
