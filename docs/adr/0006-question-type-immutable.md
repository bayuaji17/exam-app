# Question type is immutable after creation

A question's type (Single-Choice, Score-Based, or Manual-Graded) is set at creation and cannot be changed; edits may change the prompt, options, scores, correctness, and media, but never the type. To change the type, an admin archives the question and creates a new one.

Allowing type migration would reinterpret existing option semantics (correctness vs. score vs. nothing) and risks changing the meaning of stored data, so the necessary migration logic was deliberately not built.
