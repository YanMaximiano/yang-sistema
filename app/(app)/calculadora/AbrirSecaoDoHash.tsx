"use client";

import { useEffect } from "react";

// links como #parametros precisam abrir a seção correspondente (as seções são <details> fechados)
export function AbrirSecaoDoHash() {
  useEffect(() => {
    function abrir() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      for (let n: Element | null = document.getElementById(id); n; n = n.parentElement) {
        if (n instanceof HTMLDetailsElement) n.open = true;
      }
    }
    abrir();
    window.addEventListener("hashchange", abrir);
    return () => window.removeEventListener("hashchange", abrir);
  }, []);

  return null;
}
