export default function GuidePage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">How to Use</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-400">1. Add a Problem</h2>
        <p className="text-sm text-gray-300">Go to <span className="text-white font-medium">Problems</span> → Click <span className="text-white font-medium">Add Problem</span></p>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Enter name, link, pattern</li>
          <li>Pick: <span className="text-white">Already Solved</span> or <span className="text-white">Solve Later</span></li>
          <li>If already solved → pick how you solved it (this decides when revision comes)</li>
          <li>If solve later → it shows up tomorrow in your Today queue</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-400">2. Revision Schedule</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm space-y-2">
          <p>⚡ Solved in &lt; 25 min → revision in <span className="text-green-400 font-medium">14 days</span></p>
          <p>⏱️ Solved in &gt; 25 min → revision in <span className="text-yellow-400 font-medium">7 days</span></p>
          <p>💡 Solved with hints → revision in <span className="text-orange-400 font-medium">3 days</span></p>
          <p>📖 Solved with solution → revision in <span className="text-red-400 font-medium">1 day</span></p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-400">3. Today Page</h2>
        <p className="text-sm text-gray-400">Shows all problems you need to solve or revise <span className="text-white">today</span>.</p>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>Click <span className="text-white">✓ Done</span> after solving</li>
          <li>Pick <span className="text-white">Done & Dusted</span> → mastered, no more revisions</li>
          <li>Pick <span className="text-white">Need More Revision</span> → choose how you solved it → schedules next revision</li>
          <li>Click <span className="text-white">Reschedule</span> → moves to tomorrow</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-400">4. Dashboard</h2>
        <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
          <li>See your daily/weekly streak</li>
          <li>See how many problems are due today</li>
          <li>See how many you rescheduled today</li>
          <li>Problem of the Day — random problem to revisit</li>
          <li>Upcoming revisions timeline</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-400">5. Streaks</h2>
        <p className="text-sm text-gray-400">Your streak increases when you complete at least one problem/revision in a day. Adding a solved problem also counts.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-400">6. Journal</h2>
        <p className="text-sm text-gray-400">After each revision, write a short reflection — what approach worked, what was tricky, key insight. Helps during future revisions.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-400">7. Analytics</h2>
        <p className="text-sm text-gray-400">See your revision activity, problems by pattern, and overall progress.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-green-400">8. Notifications</h2>
        <p className="text-sm text-gray-400">All activity (problem added, revision scheduled, mastered, rescheduled) is logged here. No emails — everything stays in-app.</p>
      </section>
    </div>
  );
}
