# FlowCraft AI Scenario Template Research

This note summarizes the interaction patterns used to refine the three P0
FlowCraft scenario templates. The goal is not to copy any one product, but to
turn common UX patterns into reusable generation constraints.

## Cross-Scenario Patterns

- A template must define the task flow, not only the visual category.
- Each flow needs a success path and at least one recoverable failure path.
- Primary CTAs should use action-specific language rather than vague labels.
- Form and submission states should keep user input intact after validation or
  processing failures.
- Generated prototypes should expose evidence of state coverage through visible
  UI, not only hidden JavaScript branches.
- Mobile first viewport must include meaningful content, a primary action, and
  the beginning of the flow.

## Learning / Education

Common interaction model:

- Course detail pages establish value, credibility, level, time commitment, and
  outcomes before asking the learner to commit.
- Trial or preview lessons reduce commitment risk and should show progress,
  resume/retry affordances, and completion feedback.
- Enrollment forms should collect minimal information, validate inline, prevent
  duplicate submission, and end with a next-step confirmation.

Template implications:

- Main pages: course detail, trial lesson, enrollment.
- Primary CTAs: start trial, continue to enrollment, confirm enrollment.
- Required states: loading, trial failure, validation, duplicate submit
  prevention, enrollment success.
- Strategy differences:
  - Efficiency shortens proof-to-trial-to-enroll.
  - Safety preserves progress and adds confirmation.
  - Delight emphasizes progress feedback and completion moments.

## Ecommerce / Shopping

Common interaction model:

- Product pages need product media, variant selection, stock clarity, reviews,
  price, delivery/return promise, and a strong add-to-cart action.
- Cart pages need quantity controls, remove/undo, promo state, price summary,
  and clear checkout readiness.
- Checkout needs field validation, order review, payment failure recovery, and
  receipt confirmation.

Template implications:

- Main pages: product detail, cart review, checkout.
- Primary CTAs: add to cart, proceed to checkout, pay now, retry payment.
- Required states: out of stock, quantity error, payment failure, confirmation.
- Strategy differences:
  - Efficiency minimizes interruption before checkout.
  - Safety adds review points and recovery paths.
  - Delight uses rewarding cart feedback and lightweight recommendations.

## Financial Service

Common interaction model:

- Financial flows need plain-language input validation, progress clarity,
  assumptions, review/edit steps, and conservative confirmation language.
- Risk assessment prototypes should stay simulated and avoid implying real
  financial advice, account actions, or live transactions.
- When a result is uncertain, the UI should explain which answers contributed
  and give a way to revise them.

Template implications:

- Main pages: risk assessment, review answers, result confirmation.
- Primary CTAs: continue, review answers, view result, confirm result, return to
  edit.
- Required states: input validation, review/edit, key confirmation, uncertainty,
  error recovery.
- Strategy differences:
  - Efficiency groups questions and reduces repeated explanation.
  - Safety adds review, disclosure, edit, and recovery moments.
  - Delight should be calm and supportive rather than gamifying consequential
    choices.

## Sources Consulted

- Baymard Institute checkout and ecommerce UX research.
- Nielsen Norman Group form validation, error message, and checkout usability
  guidance.
- Material Design guidance for forms, validation, progress indicators, and
  empty/error states.
- GOV.UK Design System patterns for error summaries, check answers, and
  confirmation pages.
- Public course and learning product patterns from major learning platforms,
  reviewed as product pattern references rather than copied UI.
