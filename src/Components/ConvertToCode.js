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
      
      code += `${constraints.join('')},\n`;
    });

    // Add foreign key references
    table.columns.forEach(column => {
      if (column.foreignKey && column.references.tableId && column.references.columnName) {
        const referencedTable = tables.find(t => t.id === column.references.tableId);
        if (referencedTable) {
          code += `  // Foreign key reference: ${column.name} -> ${referencedTable.name}.${column.references.columnName}\n`;
        }
      }
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

    // Add fields with annotations
    table.columns.forEach(column => {
      // Add comments if any
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

      if (column.foreignKey && column.references.tableId) {
        const referencedTable = tables.find(t => t.id === column.references.tableId);
        if (referencedTable) {
          code += `    @ManyToOne\n`;
          code += `    @JoinColumn(name = "${column.name}", referencedColumnName = "${column.references.columnName}")\n`;
          code += `    private ${capitalizeFirstLetter(referencedTable.name)} ${toCamelCase(referencedTable.name)};\n\n`;
          return; // Skip the standard field declaration below
        }
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

      code += `    private ${javaType} ${column.name};\n\n`;
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

  tables.forEach(table => {
    // Add comments if notes exist
    if (table.notes) {
      code += `// ${table.notes}\n`;
    }

    code += `model ${capitalizeFirstLetter(table.name)} {\n`;
    
    // Add columns
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

      code += `  ${column.name} ${prismaType}`;

      if(column.nullable) code += '?';

      // Add constraints
      const constraints = [];
      if (column.primaryKey) constraints.push('@id');
      if (column.unique && !column.primaryKey) constraints.push('@unique');
      if (column.primaryKey && column.type.toLowerCase() === 'int') constraints.push('@default(autoincrement())');

      // Add foreign key references
      if (column.foreignKey && column.references.tableId) {
        const referencedTable = tables.find(t => t.id === column.references.tableId);
        if (referencedTable) {
          constraints.push(`@relation(fields: [${column.name}], references: [${column.references.columnName}])`);
        }
      }

      if (constraints.length > 0) {
        code += ` ${constraints.join(' ')}`;
      }

      code += '\n';
    });

    // Add related models references
    table.columns.forEach(column => {
      if (column.foreignKey && column.references.tableId) {
        const referencedTable = tables.find(t => t.id === column.references.tableId);
        if (referencedTable) {
          code += `  ${toCamelCase(referencedTable.name)} ${capitalizeFirstLetter(referencedTable.name)}\n`;
        }
      }
    });

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