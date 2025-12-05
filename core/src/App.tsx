import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { DailyPage } from "./types";
import "./App.css";

const emptyPage = (date: string): DailyPage => ({
  date,
  schedule: "",
  todo: "",
  goals: "",
  motivation: "",
  happiness: 5,
  journal: "",
});

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // yyyy-mm-dd
  });

  const [page, setPage] = useState<DailyPage>(() => emptyPage(new Date().toISOString().slice(0, 10)));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  
  
  // Load page whenever date changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setStatus(null);
      try {
        const result = await invoke<DailyPage | null>("get_daily_page", {
          date: selectedDate,
        });
        if (!cancelled) {
          if (result) {
            setPage(result);
          } else {
            setPage(emptyPage(selectedDate));
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.toString() ?? "Failed to load day");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await invoke("save_daily_page", {
        payload: {
          ...page,
          happiness: Number(page.happiness) || 0,
        },
      });
      setStatus("Saved");
    } catch (e: any) {
      setError(e?.toString() ?? "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 2000);
    }
  }

  const onChange = <K extends keyof DailyPage>(key: K, value: DailyPage[K]) => {
    setPage((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="growth-root">
      <div className="growth-shell">
        <header className="growth-header">
          <div className="title-row">
            <h1>Growth Book</h1>
            <div className="date-save-row">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
              <button className="save-button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          <div className="status-row">
            {loading && <span className="status-chip">Loading…</span>}
            {status && <span className="status-chip success">{status}</span>}
            {error && <span className="status-chip error">{error}</span>}
          </div>
        </header>

        <main className="growth-grid">
          {/* Today's Schedule */}
          <section className="card card-schedule">
            <div className="card-header">
              <h2>Today&apos;s Schedule</h2>
            </div>
            <textarea
              className="card-textarea"
              placeholder={"09:00 - Morning meditation\n10:00 - Team meeting\n14:00 - Project work"}
              value={page.schedule}
              onChange={(e) => onChange("schedule", e.target.value)}
            />
          </section>

          {/* To-Do */}
          <section className="card card-todo">
            <div className="card-header">
              <h2>To-Do</h2>
            </div>
            <textarea
              className="card-textarea"
              placeholder={"☐ Review quarterly goals\n☐ Finish presentation\n☐ Call a friend"}
              value={page.todo}
              onChange={(e) => onChange("todo", e.target.value)}
            />
          </section>

          {/* Goals */}
          <section className="card card-goals">
            <div className="card-header">
              <h2>Goals</h2>
            </div>
            <textarea
              className="card-textarea"
              placeholder={"• Exercise 4x per week\n• Read 2 books this month\n• Ship my side project"}
              value={page.goals}
              onChange={(e) => onChange("goals", e.target.value)}
            />
          </section>

          {/* Motivation */}
          <section className="card card-motivation">
            <div className="card-header">
              <h2>Motivation</h2>
            </div>
            <textarea
              className="card-textarea"
              placeholder={
                '"You are capable of amazing things. Every small step forward is progress worth celebrating."'
              }
              value={page.motivation}
              onChange={(e) => onChange("motivation", e.target.value)}
            />
          </section>

          {/* Happiness */}
          <section className="card card-happiness">
            <div className="card-header">
              <h2>Happiness</h2>
            </div>
            <div className="happiness-body">
              <div className="happiness-score">
                <span>{page.happiness}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={page.happiness}
                onChange={(e) => onChange("happiness", Number(e.target.value))}
                className="happiness-slider"
              />
            </div>
          </section>

          {/* Daily Journal */}
          <section className="card card-journal">
            <div className="card-header">
              <h2>Daily Journal</h2>
            </div>
            <textarea
              className="card-textarea journal-textarea"
              placeholder="Write about your day, thoughts, reflections, or anything on your mind..."
              value={page.journal}
              onChange={(e) => onChange("journal", e.target.value)}
            />
            <div className="char-counter">
              {page.journal.length} characters
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
