# Physical-device acceptance checklist

Copy the run record for each device. Mark each row PASS, FAIL or N/A with a reason; an unchecked row is untested. Use disposable photos for deletion. This checklist defines expected behavior, not completed verification.

## Run record

- Date / tester:
- Device model / OS version:
- Build URL or ID / platform / development profile:
- Source commit and local changes (attach `git status --short`):
- Photo access: denied / selected / full:
- Collection and approximate library size:
- Result: pending / pass / fail:

Minimum coverage: one physical iPhone and one physical Android using custom development builds. On Android, include selected-photo access where supported. Record missing coverage explicitly.

## Core pass

| ID | Action | Expected result | Result / evidence |
| --- | --- | --- | --- |
| P1 | Deny Connect Photos, then retry | No crash or stuck loading; clear recovery path; demo remains usable | |
| P2 | Grant selected-photo access | Only accessible photos appear; limited-access explanation is visible | |
| P3 | Change allowed photos; revoke access in Settings; return and reconnect | New access is respected; inaccessible photos are not actionable; no crash | |
| P4 | Grant full access; choose recent, an album and a valid month | Correct photos appear; collection switches do not mix in old size results | |
| P5 | Enter malformed or empty month | No unintended date range is selected; recoverable feedback | |
| C1 | Swipe right/left, use Keep/Remove, then Undo | Correct decision and card return; swipe alone never deletes originals | |
| C2 | Swipe repeatedly and attempt Undo during animation | No skipped/duplicate decisions, blank card or previous-card flash | |
| C3 | Keep one queued item from the queue | Only that item leaves the queue; original remains | |
| C4 | Undo Keep and Remove, including the final photo and across filters | Previous photo slides back from the correct side; current card stays behind it; repeated taps cannot overlap returns; Reduce Motion skips the slide | |
| C5 | Select Screenshots and Large photos | Screenshots match metadata/name rules; Large photos uses known sizes of at least 1 MB; decisions agree across filters | |
| D1 | Queue two disposable photos; cancel the OS deletion prompt | Both originals and queue entries remain | |
| D2 | Review and confirm deletion; retain an unqueued control photo | Only reviewed photos are removed; control remains; queue/counts update | |
| D3 | Try Undo after confirmed removal | Deleted photos cannot reappear through Undo | |
| S1 | Force-close and reopen after keep/queue decisions | Progress is restored for the same collection | |
| S2 | Switch album, load more, switch back; switch phone/demo | Shared phone decisions persist; demo decisions remain separate | |
| S3 | Start fresh | Decisions reset; previously deleted phone originals are not restored | |

## Edge cases and usability

| ID | Action | Expected result | Result / evidence |
| --- | --- | --- | --- |
| E1 | Open an empty album/month and finish a collection | Clear empty/completed state; navigation still works | |
| E2 | Browse more than 80 photos | Batches of 40 load without duplicates; scrolling does not fetch automatically; Load next 40 photos fetches the next batch | |
| E3 | Try HEIC and a cloud-only original, online and offline | No crash or indefinite blocked interaction; unavailable media is recoverable; unknown sizes stay explicitly incomplete | |
| E4 | Queue known-size and unknown-size photos | Total distinguishes known bytes from incomplete metadata | |
| U1 | Toggle the app's dark appearance and relaunch | Appearance persists; text and actions remain readable | |
| U2 | Enable large text and VoiceOver/TalkBack | Main actions are named and reachable; primary buttons do not become unusable | |
| U3 | Inspect opaque panels and controls in light and dark mode | Controls remain readable and usable; record any unsupported accessibility behavior | |
| U4 | Swipe and scroll for five minutes on a large library | No crash, repeated stalls, blank images or excessive heat; record observed lag | |
| U6 | Scroll to both ends on a small phone | Status-bar edge fades through blur; no bottom navigation; controls and queue remain reachable above the home indicator | |
| U5 | Open/close chooser and queue; use Android Back | Expected overlay closes without lost progress or trapped navigation | |

## Failure report

- Test ID / severity (blocks cleanup, wrong data, visual, other):
- Device, OS, build URL/ID and source revision:
- Permission state / collection / photo type:
- Exact steps:
- Expected / actual:
- Reproduces how often:
- Screenshot or short recording using disposable photos; relevant error text:

## Exit criteria

Both platform core passes succeed, with no unexplained deletion, lost decisions or blocking crashes. Edge-case failures are recorded and resolved or explicitly accepted before a beta. Performance and accessibility observations require device evidence; automated checks and JavaScript exports cannot substitute for it.
