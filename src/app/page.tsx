export default function Home() {
  return (
    <main>
      <header><a className="brand" href="/">recall<span>.</span></a><span className="label">YOUR PERSONAL PRACTICE</span></header>
      <section className="intro">
        <p className="eyebrow">SOLVED ONCE. REMEMBER LONGER.</p>
        <h1>A little recall.<br />A lot more confidence.</h1>
        <p className="subtitle">A quiet place to revisit the problems you’ve solved, one thought at a time.</p>
      </section>
      <section className="workspace" aria-labelledby="library-title">
        <div className="section-heading"><h2 id="library-title">Your library</h2><span className="count">0 problems</span></div>
        <div className="empty-state">
          <div className="card-mark" aria-hidden="true">{ "{ }" }</div>
          <h3>Your next review starts here.</h3>
          <p>We’ll start with your own notes. Import a previously solved problem, then revisit it with the answers tucked away.</p>
          <span className="status">Project setup complete · Import is coming next</span>
        </div>
      </section>
      <footer><span>Built for remembering, at your own pace.</span><span>LeetCode Recall</span></footer>
    </main>
  );
}
