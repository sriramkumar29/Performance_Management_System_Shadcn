---
description: Generate an ER diagram in `dbdiagram.io` DSL format using all models from the `models/` folder. Include field types, PKs, and FKs. Clearly show relationships with ref clauses.
---

Analyze all database models in the `models/` folder of this project.

1. Identify all entities (tables) and their attributes, including primary keys, foreign keys, and data types.
2. Detect relationships between models (one-to-one, one-to-many, many-to-many).
3. Generate an ER diagram using the **dbdiagram.io DSL** syntax with:
   - `Table` declarations for each entity
   - Field names and their types
   - Primary keys and foreign keys explicitly marked
   - Relationship definitions using `Ref:` clauses

Ensure:
- The output is clean and copy-pasteable into https://dbdiagram.io for visualization
- All foreign key references include correct source and target fields
- Relationships use the correct direction and notation (e.g., `Ref: orders.user_id > users.id`)
- Only use information from the actual codebase — do not guess or assume

Group related entities for readability and include comments to identify logical modules if applicable.
