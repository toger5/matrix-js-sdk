# Meeting Notes: BigBlueButton and Neoboard + MatrixRTC
Links:
 - implementation notes: https://github.com/toger5/matrix-js-sdk/commit/b261a3f9324afa6547423ebd38912086ad1b0c3e
 - MSC: https://github.com/matrix-org/matrix-spec-proposals/blob/toger5/matrixRTC/proposals/4143-matrix-rtc.md
 
- **Actionable implementation** support multiple rtc sessions (of different type) per room (js-sdk matrixRTCSessionManager.ts)
    - Update the rust and js-sdk implementation to conform to the state key format from the spec (`user_device_app`) (not it is `user_device`)
    - livekit/room identity needs to be adjusted.
- **Solved** decide if BBB is of type `m.call` or `org.bigbluebutton.call` (or `session`)
    - `m.call` -> interop with ec **potential future step**
    - `org.bigbluebutton.call` parallel call and BigBlueButton sessions are possible, we dont need to add encryption to BigBlueButton **Start with this**

- **Follow up topic** How does the join/creation flow look like (in EW)
  - This is for the future
  - Focus on making things general purpose to have good maintainablility.
  - EW should support general purpose rtc session in a general smart way and not have too many custom rules.

- **Actionable Spec Comment** EW needs to support detecting and displaying different rtc session and a way to allow joining them
    - Where do we store what widget needs to be used for which rtc session type.
        - Idea1: in the widget metadata, the widget lets the client know in its stat event, that it can handle rtc sessions of appliaction type `X` and when there is a session of type `X` the clinet will autmatically open the correct widget
          - problem: can only work with one widget per session type (not possible to have to Whiteboards at the same time)
          - advantage: no change needed for membership state events and there cant happen any conflict.
        - Idea 2: The member events making up the rtc session links to which widget can be used to open the session.
          - problem: different members could claim different widgets but be in the same rtc session
             - solution: The widget id could be part (equivalent) to the call_id.
             Specifiy that as part of the session identity. If using a different widget_id a member will end up in a differrent real time session.

- **Issue**/**Actionable Spec Comment** Widgets can read other widgets state event because its the same event type.
    - lazy solution: Accept this, and make sure each rtc session will use encryption -> the metadata from the ongoing sessions is not containing enough information to be an issue?
    - actual solution: Introduce a capability to the widget api that allows scoping for only one session.
       - use the "associated widget" semantigs from above and create a custom capability based on widget id.
       - introuce a general purpose "state key suffix" format for the already existing state event state key capability and be smart in specifying the state key. (end with appliaction data)