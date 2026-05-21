import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSummary, setModalSummary] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    fetch('/api/notes')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setNotes(data.notes);
        if (data.notes.length > 0) {
          setCurrent(pickRandom(data.notes));
          setTimeout(() => setVisible(true), 50);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const nextNote = useCallback(() => {
    if (notes.length === 0) return;
    setVisible(false);
    setModalOpen(false);
    setTimeout(() => {
      setCurrent(pickRandom(notes));
      setTimeout(() => setVisible(true), 30);
    }, 350);
  }, [notes]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') setModalOpen(false);
      if (!modalOpen && (e.key === ' ' || e.key === 'ArrowRight')) {
        e.preventDefault();
        nextNote();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextNote, modalOpen]);

  const openSummary = useCallback(() => {
    if (!current) return;
    const summary = notes.find(
      n => n.book.toLowerCase() === current.book.toLowerCase() &&
           n.type.toLowerCase().includes('summary')
    );
    setModalSummary(summary || null);
    setModalOpen(true);
  }, [current, notes]);

  const onBackdropClick = e => {
    if (e.target === modalRef.current) setModalOpen(false);
  };

  const isHighlight = current?.type?.toLowerCase().includes('highlight');
  const hasSummary = current && notes.some(
    n => n.book.toLowerCase() === current.book.toLowerCase() &&
         n.type.toLowerCase().includes('summary')
  );

  return (
    <>
      <Head>
        <title>Kindle Notes</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="page">
        {loading && (
          <div className="loading">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}

        {error && (
          <div className="error">
            <p>Could not load notes.</p>
            <p className="error-detail">{error}</p>
          </div>
        )}

        {!loading && !error && notes.length === 0 && (
          <div className="empty">No notes found in your sheet.</div>
        )}

        {current && (
          <main className={`card ${visible ? 'visible' : ''}`}>
            <div className={`badge ${isHighlight ? 'badge-highlight' : 'badge-summary'}`}>
              {isHighlight ? 'Highlight' : 'Summary'}
            </div>
            <p className="note-text">{current.annotation}</p>
            <footer className="note-footer">
              <button
                className={`book-title ${hasSummary ? 'has-summary' : ''}`}
                onClick={hasSummary ? openSummary : undefined}
                title={hasSummary ? 'Click to see book summary' : undefined}
              >
                {current.book}
                {hasSummary && <span className="summary-dot" aria-hidden="true">◦</span>}
              </button>
              {current.author && <span className="author">— {current.author}</span>}
            </footer>
          </main>
        )}

        {!loading && !error && notes.length > 0 && (
          <div className="controls">
            <button className="next-btn" onClick={nextNote}>
              Next note <span className="arrow">→</span>
            </button>
          </div>
        )}

        {modalOpen && (
          <div className="backdrop" ref={modalRef} onClick={onBackdropClick} role="dialog" aria-modal="true">
            <div className="modal">
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
              <div className="modal-label">Book summary</div>
              <h2 className="modal-book">{current?.book}</h2>
              {current?.author && <p className="modal-author">{current.author}</p>}
              <div className="modal-divider" />
              {modalSummary
                ? <p className="modal-text">{modalSummary.annotation}</p>
                : <p className="modal-empty">No summary found for this book.</p>
              }
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:             #0d0d0d;
          --surface:        #161616;
          --border:         #2a2a2a;
          --text:           #f0ebe2;
          --text-muted:     #7a7065;
          --text-dim:       #4a4540;
          --accent:         #c9a96e;
          --highlight-col:  #6ea8c9;
          --summary-col:    #8fc99a;
          --font:           'Outfit', sans-serif;
        }

        html, body {
          height: 100%;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font);
          -webkit-font-smoothing: antialiased;
        }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem 5rem;
        }

        .loading { display: flex; gap: 8px; }
        .dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--text-dim);
          animation: pulse 1.2s ease-in-out infinite;
        }
        .dot:nth-child(2) { animation-delay: .2s; }
        .dot:nth-child(3) { animation-delay: .4s; }
        @keyframes pulse {
          0%,100% { opacity:.3; transform:scale(.8); }
          50%      { opacity:1;  transform:scale(1); }
        }

        .error { text-align: center; color: #e07070; font-size: .95rem; }
        .error-detail { margin-top: .5rem; color: var(--text-dim); font-size: .8rem; font-family: monospace; }
        .empty { color: var(--text-muted); font-size: .95rem; }

        .card {
          max-width: 780px; width: 100%;
          opacity: 0; transform: translateY(10px);
          transition: opacity .35s ease, transform .35s ease;
        }
        .card.visible { opacity: 1; transform: translateY(0); }

        .badge {
          display: inline-block;
          font-size: .65rem; font-weight: 500;
          letter-spacing: .12em; text-transform: uppercase;
          padding: 3px 9px; border-radius: 99px;
          margin-bottom: 2rem;
        }
        .badge-highlight { color:var(--highlight-col); background:rgba(110,168,201,.12); border:1px solid rgba(110,168,201,.2); }
        .badge-summary   { color:var(--summary-col);   background:rgba(143,201,154,.12); border:1px solid rgba(143,201,154,.2); }

        .note-text {
          font-size: clamp(.75rem, 2vw, 1.1rem);
          font-weight: 300;
          line-height: 1.6;
          color: var(--text);
          margin-bottom: 2.5rem;
        }

        .note-footer { display: flex; flex-direction: column; gap: .35rem; }

        .book-title {
          background: none; border: none; padding: 0;
          font-family: var(--font); font-size: 1rem; font-weight: 500;
          color: var(--text); text-align: left; cursor: default;
          display: inline-flex; align-items: center; gap: .4rem;
        }
        .book-title.has-summary { color: var(--accent); cursor: pointer; transition: opacity .15s; }
        .book-title.has-summary:hover { opacity: .75; }
        .summary-dot { font-size: 1.1rem; opacity: .6; }

        .author { font-size: .9rem; color: var(--text-muted); font-weight: 300; }

        .controls { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); }
        .next-btn {
          background: none; border: 1px solid var(--border);
          color: var(--text-muted); font-family: var(--font);
          font-size: .85rem; font-weight: 400; letter-spacing: .03em;
          padding: .6rem 1.4rem; border-radius: 99px; cursor: pointer;
          display: flex; align-items: center; gap: .5rem;
          transition: border-color .15s, color .15s, background .15s;
        }
        .next-btn:hover { border-color: var(--text-muted); color: var(--text); background: rgba(255,255,255,.04); }
        .next-btn:hover .arrow { transform: translateX(3px); }
        .arrow { transition: transform .15s; }

        .backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.75); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem; z-index: 100;
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }

        .modal {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 2.5rem;
          max-width: 640px; width: 100%;
          position: relative; max-height: 85vh; overflow-y: auto;
          animation: slideUp .25s ease;
        }
        @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }

        .modal-close {
          position: absolute; top: 1.2rem; right: 1.2rem;
          background: none; border: none; color: var(--text-dim);
          font-size: .9rem; cursor: pointer; padding: 4px 8px;
          border-radius: 4px; transition: color .15s;
        }
        .modal-close:hover { color: var(--text); }
        .modal-label { font-size: .65rem; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--summary-col); margin-bottom: .75rem; }
        .modal-book { font-size: 1.3rem; font-weight: 600; margin-bottom: .3rem; }
        .modal-author { font-size: .9rem; color: var(--text-muted); font-weight: 300; }
        .modal-divider { height: 1px; background: var(--border); margin: 1.5rem 0; }
        .modal-text { font-size: 1.05rem; line-height: 1.7; font-weight: 300; }
        .modal-empty { font-size: .9rem; color: var(--text-muted); }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        @media (max-width: 600px) {
          .note-text { font-size: .675rem; }
          .modal { padding: 1.75rem; }
        }
      `}</style>
    </>
  );
}
