'use client';
import { useState } from 'react';
import { saveQuestion, type ProblemQuestion } from '@/lib/database';

export default function ProblemQuestions({ problemId, questions, initiallyOpen, onSaved }: {
  problemId: string; questions: ProblemQuestion[]; initiallyOpen: boolean; onSaved: (question: ProblemQuestion) => void;
}) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string>();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [open, setOpen] = useState(initiallyOpen);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const question = await saveQuestion(problemId, text, editing);
      onSaved(question); setText(''); setEditing(undefined); setMessage('Question saved on this device.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Your text is still here; please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="my-questions">
    <button className="reveal-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><span>My questions ({questions.length})</span><span>{open ? 'Hide −' : 'Open +'}</span></button>
    {open && <div>
      <p className="muted small">Write down what you want to revisit. These questions stay on this device and don’t change your review schedule.</p>
      {questions.map(question => <article className="question-note" key={question.id}><p>{question.text}</p><button type="button" className="text-button" disabled={busy} onClick={() => { setEditing(question.id); setText(question.text); setError(''); setMessage(''); }}>Edit question</button></article>)}
      <form onSubmit={save}>
        <label htmlFor="problem-question">{editing ? 'Edit your question' : 'Add a question'}</label>
        <textarea id="problem-question" rows={4} maxLength={10000} required value={text} onChange={e => setText(e.target.value)} placeholder="What is still unclear about this problem?" />
        <div className="actions"><button className="secondary" disabled={busy || !text.trim()} type="submit">{busy ? 'Saving…' : 'Save question'}</button>{editing && <button type="button" className="text-button" disabled={busy} onClick={() => { setEditing(undefined); setText(''); setError(''); }}>Cancel edit</button>}</div>
        {error && <p role="alert" className="error">{error}</p>}{message && <p role="status" className="muted small">{message}</p>}
      </form>
    </div>}
  </section>;
}
