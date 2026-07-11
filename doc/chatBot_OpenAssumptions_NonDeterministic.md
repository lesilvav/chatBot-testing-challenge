# Open assumptions

- **English-only prompts**: although the chat supports different languages, all test prompts and reference answers are in English to simplify the implementation.
- **Fixture content is unvalidated**: the golden-set and hallucination-set prompts/reference answers/expected patterns are a first draft never run against the actual local model. Expect to revise reference answers, synonyms, and hedge phrases after an initial calibration pass.
- **Hedge-phrase list is heuristic and incomplete**: the model may express uncertainty in a way not covered by `hedgePhrasePattern`, causing a false "hallucination" failure (false negative on the check, i.e., the check fails even though the model behaved correctly). No process yet defined for iterating this list over time.
- **Verifiable-fact synonym coverage**: each fact allows only 1–2 accepted phrasings; a correct-but-differently-worded answer (e.g. a third valid synonym) would incorrectly fail. No fallback (e.g. secondary manual review) is defined for this case.
- **Consistency coverage gap**: only 5 of the 10 golden-set prompts (one per category) are checked for consistency; the other 5 are only checked for relevance. Confirm whether this partial coverage is acceptable long-term or should expand.
- **Resolved — embedding model/library now pinned to exact versions**: `@huggingface/transformers@4.2.0` (npm, exact version, not a `^`/`~` range) and `onnx-community/all-MiniLM-L6-v2-ONNX` at revision `aff7a1d` (exact commit hash, loaded via `from_pretrained(..., { revision: 'aff7a1d' })`). Still pending: adding `@huggingface/transformers` as an actual dependency in `package.json` (not yet installed) and re-validating this pin whenever the model or library is upgraded.
- **"Advisory/tracked" has no defined process**: results are explicitly non-blocking, but there is no defined owner, cadence, or escalation path for reviewing tracked failures. Needs stakeholder input on where these results are reported (e.g. CI artifact, dashboard, ticket).
- **Execution cadence not decided**: whether this suite runs on every PR, nightly, or on-demand was discussed as a tradeoff (real LLM + real embedding inference cost) but never finalized.
- **UI Automation coverage**: Few set of UI test scripts were automated since most of the UI logic was covered using unit tests.

