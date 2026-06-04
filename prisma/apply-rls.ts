import './load-env';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../lib/db';

async function main() {
  console.log('Reading RLS SQL script...');
  const sqlPath = path.join(__dirname, 'enable_rls.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Strip lines that start with -- (SQL comments)
  let sqlWithoutComments = sqlContent
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  // Check if auth.uid function is defined, and extract it to prevent semicolon split issue
  const functionMatch = sqlWithoutComments.match(/CREATE OR REPLACE FUNCTION auth\.uid\(\)[\s\S]*?LANGUAGE sql STABLE;/i);
  if (functionMatch) {
    const functionSql = functionMatch[0];
    try {
      // Execute the schema creation first if present
      if (sqlWithoutComments.includes('CREATE SCHEMA IF NOT EXISTS auth;')) {
        try {
          await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS auth;');
        } catch (e) {
          console.log('Note: CREATE SCHEMA IF NOT EXISTS auth failed (expected on managed Supabase platforms).');
        }
        // Remove schema creation from the rest of SQL
        sqlWithoutComments = sqlWithoutComments.replace('CREATE SCHEMA IF NOT EXISTS auth;', '');
      }
      try {
        await prisma.$executeRawUnsafe(functionSql);
        console.log('Successfully created mock auth.uid() function.');
      } catch (e) {
        console.log('Note: CREATE OR REPLACE FUNCTION auth.uid() failed (expected on managed Supabase platforms where auth.uid() is pre-defined).');
      }
      // Remove function SQL from remaining queries
      sqlWithoutComments = sqlWithoutComments.replace(functionSql, '');
    } catch (err) {
      console.warn('Failed to process mock auth.uid() fallback structure:', err);
    }
  }

  // Split remaining SQL commands by semicolon
  const commands = sqlWithoutComments
    .split(';')
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd.length > 0);

  console.log(`Executing remaining ${commands.length} SQL commands to enable RLS...`);

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    try {
      await prisma.$executeRawUnsafe(cmd);
      console.log(`[${i + 1}/${commands.length}] Success: ${cmd.substring(0, 60).replace(/\n/g, ' ')}...`);
    } catch (err) {
      console.error(`[${i + 1}/${commands.length}] Failed to execute:`, cmd);
      console.error('Error:', err);
      process.exit(1);
    }
  }

  console.log('Row Level Security (RLS) successfully applied to all tables!');
}

main()
  .catch((err) => {
    console.error('Failed to apply RLS:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
