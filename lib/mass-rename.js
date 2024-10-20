/*
	Mass Rename

	Copyright (c) 2024 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/
"use strict" ;



const cliManager = require( 'utterminal' ).cli ;
const termkit = require( 'terminal-kit' ) ;
const term = termkit.terminal ;
const fsKit = require( 'fs-kit' ) ;
const string = require( 'string-kit' ) ;

const path = require( 'path' ) ;
const fs = require( 'fs' ) ;

const packageJson = require( '../package.json' ) ;



const format = string.createFormatter( {
	extraArguments: false
} ) ;



async function massRename( params ) {
	var fileNameList = await fsKit.readdir( params.directory , { files: true , directories: false } ) ;

	if ( params.interactive ) {
		term.on( 'key' , key => {
			switch ( key ) {
				case 'CTRL_C' :
					term.processExit() ;
					break ;
			}
		} ) ;
	}


	for ( let fileName of fileNameList ) {
		let changedFileName = fileName ,
			apply = ! params.dry ;

		if ( params.regex && params.regex.length ) {
			for ( let i = 0 , imax = Math.min( params.regex.length , params.substitute.length ) ; i < imax ; i ++ ) {
				let regex = params.regex[ i ] ;
				let substitute = params.substitute[ i ] ;
				changedFileName = changedFileName.replace( regex , ( ... matches ) => format( substitute , ... matches ) ) ;
				//console.log( "changedFileName:" , changedFileName ) ;
			}
		}

		if ( params.trim ) {
			let extname = path.extname( changedFileName ) ;
			let basename = changedFileName.slice( 0 , - extname.length ) ;
			changedFileName = basename.trim() + extname.trim() ;
		}

		if ( changedFileName === fileName ) { continue ; }
		let oldPath = path.join( params.directory , fileName ) ;
		let newPath = path.join( params.directory , changedFileName ) ;

		//console.log( "About to change:" , fileName , "->" , changedFileName ) ;
		term( '"^c%s^:" -> "^y%s^:"' , fileName , changedFileName ) ;
		if ( params.interactive ) {
			term( " ? [Y/n] " ) ;
			let response = await term.yesOrNo().promise ;
			if ( ! response ) { apply = false ; }
		}
		term( "\n" ) ;

		if ( apply ) {
			await fs.promises.rename( oldPath , newPath ) ;
		}
	}
}

module.exports = massRename ;



massRename.cli = () => {
	/* eslint-disable indent */
	cliManager.package( packageJson )
		.usage( "<directory> <pattern> <substitute>" )
		.app( "Mass Rename" )
		//.noIntro
		.helpOption.logOptions
		.camel
		.description( "Rename files in the current directory using regular expressions." )
		.arg( 'directory' ).string
			.description( "The pattern" )
		.opt( [ 'pattern' , 'p' ] ).arrayOf.string
			.description( "The pattern. If it starts with a '-', prefix it with an '\\'." )
		.opt( [ 'substitute' , 's' ] ).arrayOf.string
			.description( "The substitution format string. It uses the String Kit .format()'s syntax. Also if it starts with a '-', prefix it with an '\\'." )
		.opt( [ 'case-insensitive' , 'i' ] ).flag
			.description( "Case insensitive regular expression" )
		.opt( [ 'trim' , 't' ] ).flag
			.description( "Trim basename and extension" )
		.opt( [ 'dry' ] ).flag
			.description( "Do nothing, just output what could be done" )
		.opt( [ 'interactive' , 'I' ] ).flag
			.description( "Interactive mode" ) ;
	/* eslint-enable indent */

	var args = cliManager.run() ;
	//console.log( "Args:" , args ) ;

	var params = {} ;

	params.directory = args.directory ? args.directory : process.cwd() ;
	params.dry = !! args.dry ;
	params.interactive = !! args.interactive ;

	params.trim = !! args.trim ;

	if ( args.pattern ) {
		if ( ! args.substitute || args.pattern.length !== args.substitute.length ) {
			term.red( "Number of pattern and number of substitution mismatch!\n" ) ;
			process.exit( 1 ) ;
		}

		let regexFlags = 'g' ;
		if ( args.caseInsensitive ) { regexFlags += 'i' ; }
		params.regex = args.pattern.map( p => new RegExp( p , regexFlags ) ) ;
		params.substitute = args.substitute ;
	}

	//console.log( "Params:" , params ) ;
	massRename( params ) ;
} ;

