# Nova ID Development Diary

**Project**: Nova ID - Zero Trust Identity System  
**Started**: January 2026  
**Status**: In Development

---

## About This Diary

This is my personal development diary documenting the journey of building Nova ID. I'm writing this as I go, capturing what we did, why we did it, how we did it, the problems we faced, and how we solved them.

## Diary Entries

### [Day 1: Starting the Journey](./01-day-1-starting.md)
**Date**: January 15, 2026  
**Summary**: Initial planning, architecture decisions, and why we chose Zero Trust

### [Day 2-3: Setting Up the Infrastructure](./02-day-2-3-infrastructure.md)
**Date**: January 16-17, 2026  
**Summary**: Docker Compose setup, database initialization, and the first real challenges

### [Day 4-5: Building the Authorization System](./03-day-4-5-authorization.md)
**Date**: January 18-19, 2026  
**Summary**: RBAC implementation, Keto subject sets, and permission headaches

### [Day 6-8: Frontend Development](./04-day-6-8-frontend.md)
**Date**: January 20-22, 2026  
**Summary**: Vue 3 setup, UI/UX work, and form handling nightmares

### [Day 9-15: The Problem-Solving Marathon](./05-day-9-15-problems.md)
**Date**: January 23-29, 2026  
**Summary**: All the problems we hit, debugging sessions, and solutions

### [Day 16: Looking Forward](./06-day-16-future.md)
**Date**: January 30, 2026  
**Summary**: Production readiness assessment and what's next

### [Day 17: Architecture Refactor - Three Frontends](./07-day-17-architecture-refactor.md)
**Date**: January 31, 2026  
**Summary**: Refactored to three separate frontends matching ideal Zero Trust architecture

### [Day 18: Full Ory Stack Integration](./08-day-18-ory-integration.md)
**Date**: February 1, 2026  
**Summary**: Replaced dummy API with NestJS API that actively consumes Ory services (Kratos, Keto, Hydra)

## Quick Navigation

- **New to the project?** Start with [Day 1](./01-day-1-starting.md)
- **Setting up?** Read [Day 2-3](./02-day-2-3-infrastructure.md)
- **Implementing permissions?** See [Day 4-5](./03-day-4-5-authorization.md)
- **Building the frontend?** Check [Day 6-8](./04-day-6-8-frontend.md)
- **Running into issues?** Read [Day 9-15](./05-day-9-15-problems.md)
- **Going to production?** Review [Day 16](./06-day-16-future.md)
- **Architecture refactor?** See [Day 17](./07-day-17-architecture-refactor.md)
- **Ory Stack integration?** See [Day 18](./08-day-18-ory-integration.md)

## Additional Resources

- [Architecture Comparison](./ARCHITECTURE_COMPARISON.md) - Our implementation vs recommended pattern
- [TODO: What's Missing](./TODO.md) - Comprehensive checklist
- [Project README](../README.md) - Quick start guide

---

**Note**: This diary is written in real-time as we build. Some entries might be messy, some might be frustrated, but they're all honest about what we're going through.
