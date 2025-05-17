/**
 * Converts the database schema to different ORM formats
 */

/**
 * Converts tables to Drizzle ORM schema
 * @param {Array} tables - The tables from the schema
 * @returns {string} - Drizzle schema code
 */
export const convertToDrizzle = (tables) => {
  let code = `import { pgTable, serial, varchar, boolean, integer, foreignKey } from 'drizzle-orm/pg-core';\n\n`;

  tables.forEach(table => {
    code += `export const ${table.name} = pgTable('${table.name}', {\n`;
    
    // Add columns
    table.columns.forEach(column => {
      let columnType;
      
      switch(column.type.toLowerCase()) {
        case 'int':
          columnType = column.primaryKey ? 'serial' : 'integer';
          break;
        case 'varchar':
          columnType = `varchar(${column.typeLength || '255'})`;
          break;
        case 'boolean':
          columnType = 'boolean';
          break;
        default:
          columnType = 'varchar(255)';
      }
    code += `  ${column.name}: ${columnType}()`;
    
    // Add constraints
    const constraints = [];
    if (column.primaryKey) constraints.push('.primaryKey()');
    if (!column.nullable) constraints.push('.notNull()');
    if (column.unique && !column.primaryKey) constraints.push('.unique()');
    
    // Add foreign key reference inline with the column definition
    if (column.foreignKey && column.references.tableId && column.references.columnName) {
        const referencedTable = tables.find(t => t.id === column.references.tableId);
        if (referencedTable) {
        constraints.push(`.references(() => ${referencedTable.name}.${column.references.columnName})`);
        }
    }
    
    code += `${constraints.join('')},\n`;
    });

    code += '});\n\n';
  });

  return code;
};

/**
 * Converts tables to Spring JPA entities
 * @param {Array} tables - The tables from the schema
 * @returns {string} - Spring JPA code
 */
export const convertToSpring = (tables) => {
  let code = 'package com.example.model;\n\n';
  code += 'import javax.persistence.*;\n';
  code += 'import lombok.Data;\n\n';

  tables.forEach(table => {
    code += `@Entity\n`;
    code += `@Table(name = "${table.name}")\n`;
    code += `@Data\n`;
    code += `public class ${capitalizeFirstLetter(table.name)} {\n\n`;

    // Check if table has a primary key
    const hasPrimaryKey = table.columns.some(col => col.primaryKey);
    
    // Add default ID if no primary key exists
    if (!hasPrimaryKey) {
      code += '    @Id\n';
      code += '    @GeneratedValue(strategy = GenerationType.IDENTITY)\n';
      code += '    private Long id;\n\n';
    }

    // Add fields with annotations
    table.columns.forEach(column => {
      // Check if it's a foreign key
      if (column.foreignKey && column.references.tableId) {
        const referencedTable = tables.find(t => t.id === column.references.tableId);
        if (referencedTable) {
          code += `    @ManyToOne\n`;
          code += `    @JoinColumn(name = "${column.name}", referencedColumnName = "${column.references.columnName}")\n`;
          code += `    private ${capitalizeFirstLetter(referencedTable.name)} ${toCamelCase(referencedTable.name)}Reference;\n\n`;
        }
      } else {
        // Regular field (not a foreign key)
        if (column.primaryKey) {
          code += '    @Id\n';
          code += '    @GeneratedValue(strategy = GenerationType.IDENTITY)\n';
        }

        if (column.unique && !column.primaryKey) {
          code += '    @Column(unique = true';
          code += column.nullable ? ')\n' : ', nullable = false)\n';
        } else if (!column.nullable && !column.primaryKey) {
          code += '    @Column(nullable = false)\n';
        } else if (!column.primaryKey) {
          code += '    @Column\n';
        }

        let javaType;
        switch (column.type.toLowerCase()) {
          case 'int':
            javaType = 'Integer';
            break;
          case 'varchar':
            javaType = 'String';
            break;
          case 'boolean':
            javaType = 'Boolean';
            break;
          default:
            javaType = 'String';
        }

        // Use camelCase for field names in Java
        code += `    private ${javaType} ${column.name};\n\n`;
      }
    });

    // Add notes as comments if they exist
    if (table.notes) {
      code += `    // ${table.notes}\n`;
    }

    code += '}\n\n';
  });

  return code;
};

/**
 * Converts tables to Prisma schema
 * @param {Array} tables - The tables from the schema
 * @returns {string} - Prisma schema code
 */
export const convertToPrisma = (tables) => {
  let code = '';
  code += 'generator client {\n';
  code += '  provider = "prisma-client-js"\n';
  code += '}\n\n';
  code += 'datasource db {\n';
  code += '  provider = "postgresql"\n';
  code += '  url      = env("DATABASE_URL")\n';
  code += '}\n\n';

  const relationMap = new Map();

  // First pass - collect all relations
  tables.forEach(table => {
    table.columns.forEach(column => {
      if (column.foreignKey && column.references.tableId) {
        const referencedTable = tables.find(t => t.id === column.references.tableId);
        if (referencedTable) {
          const relationName = `${table.name}To${capitalizeFirstLetter(referencedTable.name)}`;
          
          // Store this relation for the back-reference
          if (!relationMap.has(referencedTable.id)) {
            relationMap.set(referencedTable.id, []);
          }
          relationMap.get(referencedTable.id).push({
            fromTable: table,
            fromColumn: column,
            relationName: relationName
          });
        }
      }
    });
  });

  // Second pass - generate schema
  tables.forEach(table => {
    // Add comments if notes exist
    if (table.notes) {
      code += `// ${table.notes}\n`;
    }

    code += `model ${capitalizeFirstLetter(table.name)} {\n`;
    
    // First add all scalar fields (columns)
    table.columns.forEach(column => {
      let prismaType;
      
      switch (column.type.toLowerCase()) {
        case 'int':
          prismaType = 'Int';
          break;
        case 'varchar':
          prismaType = 'String';
          break;
        case 'boolean':
          prismaType = 'Boolean';
          break;
        default:
          prismaType = 'String';
      }

      // Add basic column type
      code += `  ${column.name} ${prismaType}`;
      if(column.nullable) code += '?';

      // Add constraints (but not relations)
      const constraints = [];
      if (column.primaryKey) constraints.push('@id');
      if (column.unique && !column.primaryKey) constraints.push('@unique');
      if (column.primaryKey && column.type.toLowerCase() === 'int') constraints.push('@default(autoincrement())');

      if (constraints.length > 0) {
        code += ` ${constraints.join(' ')}`;
      }

      code += '\n';
    });
    
    // Then add relation fields (separate from scalar fields)
    table.columns.forEach(column => {
      if (column.foreignKey && column.references.tableId) {
        const referencedTable = tables.find(t => t.id === column.references.tableId);
        if (referencedTable) {
          const relationName = `${table.name}To${capitalizeFirstLetter(referencedTable.name)}`;
          const refTableName = capitalizeFirstLetter(referencedTable.name);
          
          code += `  ${toCamelCase(referencedTable.name)} ${refTableName}? @relation(name: "${relationName}", fields: [${column.name}], references: [${column.references.columnName}])\n`;
        }
      }
    });
    
    // Add back-references for relations where THIS table is the target
    const backReferences = relationMap.get(table.id);
    if (backReferences && backReferences.length > 0) {
      backReferences.forEach(ref => {
        const sourceTableName = capitalizeFirstLetter(ref.fromTable.name);
        // Use plural form for arrays (one-to-many)
        code += `  ${toCamelCase(ref.fromTable.name)}s ${sourceTableName}[] @relation(name: "${ref.relationName}")\n`;
      });
    }

    code += '}\n\n';
  });

  return code;
};

/**
 * Capitalizes the first letter of a string
 * @param {string} string - The string to capitalize
 * @returns {string} - The capitalized string
 */
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

/**
 * Converts a string to camelCase
 * @param {string} string - The string to convert
 * @returns {string} - The camelCase string
 */
const toCamelCase = (string) => {
  return string.charAt(0).toLowerCase() + string.slice(1);
};