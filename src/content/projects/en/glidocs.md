---
title: Glidocs
num: "01"
category: SAAS
rolePill: Founder
roleMeta: Product · Engineering · Design
summary: "One place for everything about a job: hours, photos, notes, documents, equipment, logs and plans, so nothing slips through when it's time to estimate or invoice."
status: Closed beta
tags: [Next.js, NestJS, PostgreSQL, React Native, TypeScript]
visit:
  label: glidocs.com
  url: https://glidocs.com
cover: /projects/glidocs/board.png
coverAlt: "Glidocs jobs board: jobs moving across Preliminary, Production, Invoicing and Collection"
order: 1
---

## The problem I kept running into

Most companies that have to back up their work, whether that's estimates, invoices, or jobs out in the field, end up living across two or three disconnected tools. Keeping them in sync is the real headache: hours in one, photos in another, notes somewhere else. By the time you sit down to put together an estimate or an invoice, small details have already slipped through the cracks.

Glidocs is the tool I wished I had: one place where everything about a job lives together.

## What it does

Every job in Glidocs carries its whole story: worked hours, photos, notes, documents, key dates, machinery and equipment, logs, and plans, all attached to the job instead of scattered across apps. So when it's time to estimate or invoice, the full picture is already there and nothing gets missed.

Right now I'm building out hydro reports and contents tracking, with AI assistance next on the roadmap.

## The hard parts

**Security.** Getting the backend guards right so every request only ever returns data the user is allowed to see. The piece that took the most work was the images: they can't sit behind public URLs, so serving them safely while still rendering quickly was a problem of its own.

**Multiple companies, one account.** An owner with two or more companies can register all of them under a single account and have them coexist, with isolated data and a shared login. Designing that separation without duplicating the entire system was one of the bigger architectural challenges.

**QuickBooks and reports.** Wiring real accounting data in through the QuickBooks integration, and generating clean reports out the other side.

## Why this stack

Next.js on the web, NestJS for the API, PostgreSQL, React Native for mobile, TypeScript end to end. I deliberately chose what I know deeply over the newest thing on the shelf; I didn't want to bet the project on package compatibility surprises mid build. A fully typed stack also lets the web and mobile apps share the same backend and the same data shapes.

## Where it is now

Glidocs is in closed beta. I'm running it on real jobs and so far it's holding up well, I'm still polishing the edges. It's a 100% solo project: I'm an Information Technologies engineer, and every layer so far is mine: product, backend, web, mobile, and design.

## Same problem?

If your team lives across scattered tools and details keep slipping through when you estimate or invoice, [send me an email](/contact). I'll walk you through what Glidocs does and get you access.
