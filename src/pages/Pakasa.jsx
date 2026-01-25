import React, { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
import { ip } from "./ip";

function fmtDate(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "-";
  }
}

export default function Pakasa() {
  const WORDS_BASE = `${ip}/admin/words`; // GET/POST
  const WORDS_DISTINCT = `${ip}/admin/words/distinct`; // GET
  // DELETE: `${ip}/admin/words/:id`
  // ====================================================

  const token = () => localStorage.getItem("admin_token");

  const [game, setGame] = useState("pakasa"); // pakasa | yesno
  const [lang, setLang] = useState("");
  const [category, setCategory] = useState("");
  const [word, setWord] = useState("");

  const [langs, setLangs] = useState([]);
  const [categories, setCategories] = useState([]);

  const [openLang, setOpenLang] = useState(false);
  const [openCat, setOpenCat] = useState(false);

  const [tableQ, setTableQ] = useState("");

  const [items, setItems] = useState([]); // words list
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveLang = useMemo(() => (lang || "").trim(), [lang]);
  const effectiveCategory = useMemo(() => (category || "").trim(), [category]);
  const effectiveWord = useMemo(() => (word || "").trim(), [word]);

  const loadDistinct = async (g) => {
    try {
      const t = token();
      if (!t) return;

      const params = new URLSearchParams();
      params.set("game", g);

      const res = await fetch(`${WORDS_DISTINCT}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;

      setLangs(Array.isArray(data.langs) ? data.langs : []);
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {
    }
  };

  const loadWords = async (g) => {
    const t = token();
    if (!t) {
      setLoading(false);
      setError("Session expired. Please login again.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("game", g);

      const res = await fetch(`${WORDS_BASE}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load words");


      const list = Array.isArray(data) ? data : Array.isArray(data.words) ? data.words : [];

      const mapped = list.map((x) => ({
        id: x.id || x._id,
        word: x.word || x.text || x.value || "",
        lang: x.lang || x.language || "",
        category: x.category || "",
        game: x.game || g,
        createdAt: x.createdAt || x.created_at || null,
      }));

      setItems(mapped);

      loadDistinct(g);
    } catch (e) {
      setError(e.message || "Failed to load words");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords(game);
  }, [game]);

  const addWord = async () => {
    if (!effectiveLang) return alert("lang is required");
    if (!effectiveCategory) return alert("category is required");
    if (!effectiveWord) return alert("word is required");

    const t = token();
    if (!t) return alert("Session expired");

    try {
      setSaving(true);

      const res = await fetch(WORDS_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          game,
          lang: effectiveLang,
          category: effectiveCategory,
          word: effectiveWord,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to add word");

      const created = data.word || data.item || data;
      if (created && (created._id || created.id)) {
        const row = {
          id: created.id || created._id,
          word: created.word || created.text || effectiveWord,
          lang: created.lang || created.language || effectiveLang,
          category: created.category || effectiveCategory,
          game: created.game || game,
          createdAt: created.createdAt || new Date().toISOString(),
        };
        setItems((prev) => [row, ...prev]);
      } else {
        await loadWords(game);
      }

      await loadDistinct(game);

      setWord(""); 
      setOpenLang(false);
      setOpenCat(false);
    } catch (e) {
      alert(e.message || "Failed to add word");
    } finally {
      setSaving(false);
    }
  };

  const deleteWord = async (id) => {
    if (!window.confirm("Delete this word?")) return;

    const t = token();
    if (!t) return alert("Session expired");

    try {
      const res = await fetch(`${WORDS_BASE}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete");

      setItems((prev) => prev.filter((x) => x.id !== id));
      await loadDistinct(game);
    } catch (e) {
      alert(e.message || "Failed to delete");
    }
  };

  const filtered = useMemo(() => {
    const t = (tableQ || "").trim().toLowerCase();
    if (!t) return items;
    return items.filter((x) => {
      return (
        String(x.word || "").toLowerCase().includes(t) ||
        String(x.lang || "").toLowerCase().includes(t) ||
        String(x.category || "").toLowerCase().includes(t) ||
        String(x.game || "").toLowerCase().includes(t) ||
        String(x.id || "").toLowerCase().includes(t)
      );
    });
  }, [items, tableQ]);

  return (
    <div className="col">
      <div className="card pad">
        <h2 className="h1">
          <span className="orange">Words</span> management
        </h2>
        <p className="sub">Default shows all words. Type or pick Language/Category then add words.</p>
      </div>

      <div className="card pad">
        <div className="row" style={{ alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
          {/* Game */}
          <div style={{ minWidth: 220 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Game</div>
            <select className="input" value={game} onChange={(e) => setGame(e.target.value)}>
              <option value="pakasa">Pakasa</option>
              <option value="yesno">Yes / No</option>
            </select>
          </div>

          {/* Language Combo */}
          <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <div className="pill" style={{ marginBottom: 8 }}>Language</div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                placeholder="e.g. ar / en / fr / عربي"
                onFocus={() => setOpenLang(false)}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setOpenLang((p) => !p);
                  setOpenCat(false);
                }}
                style={{ paddingInline: 12 }}
                title="Pick from existing"
              >
                ▾
              </button>
            </div>

            {openLang && langs.length > 0 && (
              <div
                className="card"
                style={{
                  position: "absolute",
                  top: 72,
                  left: 0,
                  right: 52,
                  zIndex: 50,
                  padding: 10,
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                <div className="sub" style={{ margin: "0 0 8px 0" }}>Previously used</div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {langs.map((x) => (
                    <button
                      key={x}
                      className="pill"
                      type="button"
                      onClick={() => {
                        setLang(x);
                        setOpenLang(false);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Category Combo */}
          <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <div className="pill" style={{ marginBottom: 8 }}>Category</div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Food / رياضة"
                onFocus={() => setOpenCat(false)}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setOpenCat((p) => !p);
                  setOpenLang(false);
                }}
                style={{ paddingInline: 12 }}
                title="Pick from existing"
              >
                ▾
              </button>
            </div>

            {openCat && categories.length > 0 && (
              <div
                className="card"
                style={{
                  position: "absolute",
                  top: 72,
                  left: 0,
                  right: 52,
                  zIndex: 50,
                  padding: 10,
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                <div className="sub" style={{ margin: "0 0 8px 0" }}>Previously used</div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  {categories.map((x) => (
                    <button
                      key={x}
                      className="pill"
                      type="button"
                      onClick={() => {
                        setCategory(x);
                        setOpenCat(false);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Word */}
          <div style={{ flex: 2, minWidth: 260 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Word</div>
            <input
              className="input"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Write a word..."
              onKeyDown={(e) => e.key === "Enter" && addWord()}
            />
          </div>

          {/* Add */}
          <div style={{ minWidth: 170 }}>
            <button className="btn orange" style={{ width: "100%" }} onClick={addWord} disabled={saving}>
              {saving ? "Adding..." : "+ Add Word"}
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Search فوق الجدول (مش العكس) */}
      <div className="card pad">
        <div className="row" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="pill" style={{ marginBottom: 8 }}>Search inside table</div>
            <input
              className="input"
              value={tableQ}
              onChange={(e) => setTableQ(e.target.value)}
              placeholder="Search word / category / language / id..."
            />
          </div>

          <div className="row" style={{ gap: 10 }}>
            <div className="pill">All: {items.length}</div>
            <div className="pill">Shown: {filtered.length}</div>
            <button className="btn" onClick={() => loadWords(game)} disabled={loading}>
              Refresh
            </button>
          </div>

          <Badge variant="gray">Tip: language/category lists auto-build from what you add</Badge>
        </div>
      </div>

      {loading && (
        <div className="card pad">
          <p className="sub">Loading words...</p>
        </div>
      )}

      {!loading && error && (
        <div className="card pad">
          <div className="pill red">{error}</div>
        </div>
      )}

      {!loading && !error && (
        <div className="card pad">
          <div className="tableWrap">
            <table className="table" style={{ minWidth: 980 }}>
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Lang</th>
                  <th>Category</th>
                  <th>Game</th>
                  <th>Created</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 16, color: "#667085" }}>
                      No words found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((x) => (
                    <tr key={x.id}>
                      <td style={{ fontWeight: 900 }}>{x.word || "—"}</td>
                      <td>{x.lang || "—"}</td>
                      <td>{x.category || "—"}</td>
                      <td><Badge variant="blue">{x.game}</Badge></td>
                      <td>{fmtDate(x.createdAt)}</td>
                      <td>
                        <div className="miniActions">
                          <button className="iconBtn" title="Delete" onClick={() => deleteWord(x.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
