// TypeScript AST traversal and extraction tools used by various scripts.
import { query as tsquery } from '@phenomnomnominal/tsquery';
import { ESLint } from 'eslint';
import { globSync } from 'glob';
import { spawn } from 'node:child_process';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
// import stylelint from 'stylelint';
import { svelte2tsx } from 'svelte2tsx';
import {
	type ClassDeclaration,
	type MethodSignature,
	type Node,
	Project,
	type PropertySignature,
	StringLiteral
} from 'ts-morph';

// this will break if multiple components with the same name exist in different folders
function findFile(
	base: string,
	componentName: string,
	suffix: string,
	warn: boolean = true
): string | undefined {
	const files = globSync(`./${base}/**/${componentName}${suffix}`);
	if (files.length === 0) {
		warn && console.warn(`No files found for ${componentName}`);
		return undefined;
	} else if (files.length > 1) {
		warn && console.error(`Fatal: Found multiple files for ${componentName}: ${files}`);
		return undefined;
	} else {
		return path.resolve(files[0]);
	}
}

export function getGithubUrlForSourceFile(filePath: string): string {
	// gonna be slow
	const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
	const sourceBaseUrl = packageJson.repository.url.replace('.git', '') + '/blob/main/';
	return sourceBaseUrl + filePath;
}

export function getEditUrlForSourceFile(filePath: string): string {
	// gonna be slow
	const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
	const sourceBaseUrl = packageJson.repository.url.replace('.git', '') + '/edit/main/';
	return sourceBaseUrl + filePath;
}

export function getDefinitionFilePath(
	componentName: string,
	warn: boolean = true
): string | undefined {
	return findFile('dist', componentName, '.svelte.d.ts', warn);
}

export function getSourceFilePath(componentName: string, warn: boolean = true): string | undefined {
	return findFile('src/lib', componentName, '.svelte', warn);
}

export function getAllLibraryFiles(): string[] {
	return globSync('./src/lib/**/*').filter((file) => {
		return fs.statSync(file).isFile();
	});
}

export function getAllLibraryComponentNames(): string[] {
	// what happens with js components?
	return globSync('./src/lib/**/*.svelte').map((file) => {
		return path.basename(file).replace('.svelte', '');
	});
}

export function getExportedComponents(indexPath: string): { name: string; path: string }[] {
	return queryTree<StringLiteral>(
		new Project().addSourceFileAtPath(indexPath),
		'ExportDeclaration StringLiteral[value=/.+.svelte/]'
	).map((node) => {
		const cleanPath = node.getText().replace(/["']/g, '');

		return {
			name: path.basename(cleanPath).replace('.svelte', ''),
			path: cleanPath
		};
	});
}

// brittle
export function getExportedJs(indexPath: string): { name: string; path: string }[] {
	return queryTree<StringLiteral>(
		new Project().addSourceFileAtPath(indexPath),
		'ExportDeclaration[isTypeOnly=false]:has(StringLiteral[value=/.+.js/])'
	).map((node) => {
		const name = queryTree<StringLiteral>(node, 'Identifier.name').at(0)!.getText();
		const path = queryTree<StringLiteral>(node, 'StringLiteral')
			.at(0)!
			.getText()
			.replace(/["']/g, '');

		return {
			name,
			path
		};
	});
}

/**
 * wraps tsquery to return ts-morph Nodes
 * @see https://tsquery-playground.firebaseapp.com
 * @see https://astexplorer.net/
 */
export function queryTree<T extends Node>(node: Node, tsqueryString: string): T[] {
	return tsquery(node.compilerNode, tsqueryString).map(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(n) => (node as any)._getNodeFromCompilerNode(n) as Node
	) as T[];
}

export type PropNode = MethodSignature | PropertySignature;

/**
 * @param source - either a string of source code, the name of a component with an existing definition file, or a Node
 * @param propName - optional name of a specific prop to return, happens at query level so might be more efficient than filtering the returned array
 * @param include - 'all' | 'commented' | 'uncommented' to filter the props returned by the presence of comments on the props
 * @returns an array of ts-morph Nodes representing the props meeting the argument criteria, or an empty array if none are found
 */
export function getProp(
	source: Node | string,
	propertyName: string,
	include: 'all' | 'commented' | 'uncommented' = 'all'
): PropNode | undefined {
	return getPropsInternal(source, include, propertyName)[0];
}

/**
 * @param source - either a string of source code, the name of a component with an existing definition file, or a Node
 * @param include - 'all' | 'commented' | 'uncommented' to filter the props returned by the presence of comments on the props
 * @returns an array of ts-morph Nodes representing the props meeting the argument criteria, or an empty array if none are found
 */
export function getProps(
	source: Node | string,
	include: 'all' | 'commented' | 'uncommented' = 'all'
): PropNode[] {
	return getPropsInternal(source, include);
}

function getPropsInternal(
	source: Node | string,
	include: 'all' | 'commented' | 'uncommented' = 'all',
	propertyName?: string
): PropNode[] {
	return queryTree<PropNode>(
		typeof source === 'string'
			? new Project().addSourceFileAtPath(getDefinitionFilePath(source) ?? source)
			: source,
		':declaration [name.name="props"] :matches(PropertySignature, MethodSignature):not(:declaration [name.name="props"] :matches(PropertySignature, MethodSignature) :matches(PropertySignature, MethodSignature))' +
			(include === 'commented' ? ':has([jsDoc])' : '') +
			(include === 'uncommented' ? ':not(:has([jsDoc]))' : '') +
			(propertyName === undefined ? '' : `[name.name="${propertyName}"]`)
	);
}

// doc-specific

function extractCodeBlock(inputString: string): string | undefined {
	const regex = /```\w*\n([\S\s]+?)```/gm;
	const match = regex.exec(inputString);
	if (match && match[1]) {
		return match[1].trim();
	}
	return;
}

export async function getComponentExampleCodeFromSource(
	componentName: string,
	includeMarkdown: boolean = false
): Promise<string | undefined> {
	const componentPath = getSourceFilePath(componentName);
	if (!componentPath) return undefined;

	const componentCode = svelte2tsx(fs.readFileSync(componentPath, 'utf8')).code;

	const classDeclaration = queryTree<ClassDeclaration>(
		new Project().createSourceFile('TempComponent.ts', componentCode),
		'ClassDeclaration:has([jsDoc]):has(ExportKeyword)'
	).at(0);

	// strip jsdoc comments
	if (classDeclaration === undefined) {
		console.error(`Class declaration not found in ${componentName}`);
		return undefined;
	}

	// support two extraction strategies... sticking with AST for now
	const useAst = true;

	let exampleCommentWithFence: string | undefined;
	if (useAst) {
		// Note that this breaks if there are @ css blocks in the JSDoc comments,
		// but so do a lot of other things so just don't do that!

		// try for an actual @example tag in case there are multiple code block
		exampleCommentWithFence =
			classDeclaration
				.getJsDocs()
				?.at(0)
				?.getTags()
				.find((tag) => tag.getTagName() === 'example')
				?.getCommentText() ?? classDeclaration.getJsDocs()?.at(0)?.getCommentText();
	} else {
		// Get the full text of the JSDoc block and strip the JSDoc syntax
		const fullCommentText = classDeclaration
			.getJsDocs()
			.at(0)
			?.getFullText()
			.replace(/^ ?\/*\*+[ /]?/gm, '');

		if (fullCommentText === undefined) {
			console.error(`Class declaration comment not found in ${componentName}`);
			return undefined;
		}

		// Pull out just the @example code fence
		// TODO multiple example support (via .exec, /g doesn't work with .match)
		exampleCommentWithFence = fullCommentText.match(/@example[\S\s]+(```[\S\s]+```)/m)?.at(1);
	}

	if (exampleCommentWithFence === undefined) {
		console.error(`Example comment not found in ${componentName}`);
		return undefined;
	}

	// format, because it's lost in the AST

	const exampleCommentWithoutFence = extractCodeBlock(exampleCommentWithFence);

	if (exampleCommentWithoutFence === undefined) {
		console.error(`Could not extract example code block in ${componentName}`);
		return undefined;
	}

	const formattedComment = await lintAndFormat(exampleCommentWithoutFence);

	// put the formatted code block back inside the fence
	const wrappedComment = `${exampleCommentWithFence
		.split('\n')
		.at(0)}\n${formattedComment}${exampleCommentWithFence.split('\n').at(-1)}`;

	return includeMarkdown ? wrappedComment : formattedComment;
}

// TODO better to format and lint?
export async function lintAndFormat(
	code: string,
	fileExtension: string = 'svelte',
	formatParser: string = 'svelte'
): Promise<string> {
	const lintedCode = await lint(code, fileExtension);
	const styleLintedCode = await lintStyle(lintedCode, fileExtension);
	const lintedAndFormattedCode = await format(styleLintedCode, formatParser);
	return lintedAndFormattedCode;
}

async function lint(code: string, fileExtension: string): Promise<string> {
	// Create an instance of the linter
	const eslint = new ESLint({
		fix: true,
		useEslintrc: true
	});

	let result: ESLint.LintResult | undefined;
	try {
		[result] = await eslint.lintText(code, {
			filePath: `example.${fileExtension}`
		});
	} catch (error) {
		console.log(error);
	}

	// output is undefined when there are no errors

	return result?.output ?? code;
}

async function lintStyle(code: string, fileExtension: string): Promise<string> {
	fileExtension; // unused
	return code;

	// TODO
	// broken...
	// just passing the .stylelintrc.cjs doesn't seem to work...
	// const config = await stylelint.resolveConfig(`example.${fileExtension}`);

	// const result: stylelint.LinterResult = await stylelint.lint({
	// 	code: code,
	// 	config,
	// 	configBasedir: process.cwd(),
	// 	fix: true
	// });

	// return result?.output ?? code;
}

export async function format(code: string, formatParser: string): Promise<string> {
	// much slower than the node api, but more consistently gets the right config
	return new Promise((resolve, reject) => {
		// Spawn Prettier process
		const prettierProcess = spawn('prettier', [
			'--plugin',
			'prettier-plugin-svelte',
			'--parser',
			formatParser,
			'--print-width',
			'80',
			'--use-tabs',
			'false'
		]);

		let formattedCode = '';
		let errorOutput = '';

		// Collect formatted code
		prettierProcess.stdout.on('data', (data) => {
			formattedCode += data.toString();
		});

		// Collect error messages
		prettierProcess.stderr.on('data', (data) => {
			errorOutput += data.toString();
		});

		// Handle process completion
		prettierProcess.on('close', (code) => {
			if (code === 0) {
				resolve(formattedCode);
			} else {
				reject(new Error(`Prettier exited with code ${code}: ${errorOutput}`));
			}
		});

		// Handle process errors (e.g., Prettier not found)
		prettierProcess.on('error', (error) => {
			reject(error);
		});

		// Write code to Prettier process and end input
		prettierProcess.stdin.write(code);
		prettierProcess.stdin.end();
	});
}

export async function getLastUpdatedDate(filePath: string): Promise<Date | void> {
	return new Promise((resolve, reject) => {
		exec(`git log -1 --format=%cd "${filePath}"`, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			const date = new Date(stdout.trim());
			if (Number.isNaN(date.getTime())) {
				resolve();
			} else {
				resolve(date);
			}
		});
	});
}
