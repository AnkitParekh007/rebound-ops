# ReboundOps import format (`reboundops-import`, version 1)

ReboundOps can import data from an earlier tool, or from another ReboundOps installation, through
**Settings → Import data**. Two inputs are accepted:

1. A **ReboundOps export** (`"format": "reboundops-export"`, produced by *Download a full export*).
2. A **neutral import file** in the format below. A separate tool or script can produce it from any
   earlier system. ReboundOps itself never reads another application's files or database.

## Guarantees

- **Preview first.** The file is validated and staged in memory. Nothing is written until you confirm.
- **Read-only input.** The file you choose is never modified or deleted.
- **No overwrites.** Existing profile values are kept. Only empty fields are filled, and new
  list items (skills, roles, links, experience, education, saved answers) are appended.
- **Unverified by default.** Imported experience and education are marked unverified, and imported
  postings are marked *not checked against the live posting*.
- **Duplicates are skipped**, both against existing jobs and within the file. The comparison uses
  the canonical posting URL, or employer + title + location.
- **Strict validation.** Unknown keys, wrong types, non-http(s) links, nesting deeper than 12 levels
  and files over 10 MB are rejected. A bad job record is rejected individually, with a reason, and
  the rest of the file still imports.
- **One transaction.** Either the whole confirmed import is written or nothing is.

## Schema

All dates are ISO 8601 with a time zone offset (`2026-04-03T09:00:00.000Z`). Month dates use `YYYY-MM`.

```jsonc
{
  "format": "reboundops-import",        // required
  "formatVersion": 1,                    // required
  "source": "free text",                 // optional, shown nowhere sensitive
  "exportedAt": "2026-05-01T10:00:00Z",  // optional
  "profile": {                           // optional; every field optional
    "displayName": "", "headline": "", "email": "", "phone": "", "location": "",
    "links": [{ "label": "Portfolio", "url": "https://…" }],
    "targetRoles": [""], "preferredCountries": [""], "workAuthorizedCountries": [""],
    "workArrangements": ["remote" | "hybrid" | "onsite"],
    "openToRelocation": "yes" | "no" | "unknown",
    "requiresSponsorship": "yes" | "no" | "unknown",
    "skills": [""],
    "experience": [{ "employer": "", "title": "", "start": "YYYY-MM", "end": "YYYY-MM" | null,
                     "summary": "", "highlights": [""] }],
    "education": [{ "institution": "", "qualification": "", "field": "",
                    "start": "YYYY-MM" | null, "end": "YYYY-MM" | null }],
    "answers": [{ "question": "", "answer": "" }]
  },
  "jobs": [{                             // optional; up to 5000
    "externalId": "",                    // optional, for your own reference
    "title": "", "employer": "",         // required
    "location": "", "salary": "", "sourceUrl": "https://…", "description": "",
    "capturedAt": "…",
    "status": "discovered" | "shortlisted" | "preparing" | "ready_for_review" | "applied"
            | "interviewing" | "offer" | "rejected" | "withdrawn",
    "appliedAt": "…" | null,             // when you submitted, if you did
    "history": [{ "at": "…", "status": "…", "note": "" }],
    "notes": [{ "at": "…", "text": "" }]
  }]
}
```

A complete fictional example is in `tests/fixtures/import/synthetic-v1.json`.

## Status of real legacy-data migration

The importer has been built and tested on synthetic data only. Converting data from the previous
application into this format needs a separate, authorised export step, which has not been done.
No successful migration of real legacy data is claimed.
