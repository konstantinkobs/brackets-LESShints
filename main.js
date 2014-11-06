/*
 * Copyright (c) 2014 Konstantin Kobs
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $, window */

define(function (require, exports, module) {
    "use strict";

    var AppInit             = brackets.getModule("utils/AppInit"),
        CodeHintManager     = brackets.getModule("editor/CodeHintManager"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        LanguageManager     = brackets.getModule("language/LanguageManager");
    
    /**
     * @constructor
     */
    function LESSHint() {
        
        // Some settings especially for LESS
        this.implicitChar = "@";
        this.regex = /@([\w\-]+)\s*:\s*([^\n;]+)/ig;
        this.chars = /[@\w\-]/i;
        
        // Array with hints and the visual list in HTML
        this.hints = [];
        this.hintsHTML = [];
        
        // String which was written since the hinter is active
        this.writtenSinceStart = "";
        
        // Startposition of cursor
        this.startPos = null;
        
    }

    /**
     * Checks if it is possible to give hints.
     * 
     * @param   {Object}  editor       The editor object
     * @param   {String}  implicitChar The written character
     * @returns {Boolean} whether it is possible to give hints
     */
    LESSHint.prototype.hasHints = function (editor, implicitChar) {
        
        this.editor = editor;
        
        this.startPos = editor.getCursorPos();
        
        return implicitChar ? implicitChar === this.implicitChar : false;
        
    };
    
    /**
     * Gets the hints in case there are any
     * 
     * @param   {String} implicitChar The last written character
     * @returns {Object} The list of hints like brackets wants it
     */
    LESSHint.prototype.getHints = function(implicitChar) {
        
        if(!this.validPosition(implicitChar)) return null;
        
        var text = this.getText();
        
        var matches = this.getAll(this.regex, text);
        
        matches = this.filterHints(matches);
        
        this.processHints(matches);
        
        return {
            hints: this.hintsHTML,
            match: null,
            selectInitial: true,
            handleWideResults: false
        };

    };
    
    /**
     * Inserts a chosen hint into the document
     * 
     * @param {String} hint the chosen hint
     */
    LESSHint.prototype.insertHint = function (hint) {
        
        // Get index from list
        var index = this.hintsHTML.indexOf(hint);
        // Get Hint from index
        hint = this.hints[index];
        
        // Document objects represent file contents
        var document = DocumentManager.getCurrentDocument();
        
        // Get the position of our cursor in the document
        var pos = this.editor.getCursorPos();
        
        // Add some text in our document
        document.replaceRange(hint, this.startPos, pos);
        
    };
    
    /**
     * Checks if it still is possible to give hints.
     * It is not possible to give hints anymore if:
     * - the cursor is before the position of the starting position
     * - the user typed some character which is not usable in a variable name
     * 
     * @param   {String}  implicitChar The last written character
     * @returns {Boolean} True, if the cursor has a valid position
     */
    LESSHint.prototype.validPosition = function(implicitChar){
        
        // If the written char is not in a valid
        // set of characters for a variable.
        if(implicitChar && !this.chars.test(implicitChar)){
            return false;
        }
        
        var document = DocumentManager.getCurrentDocument();
        var cursorPos = this.editor.getCursorPos();
        
        if(cursorPos.line == this.startPos.line &&
           cursorPos.ch >= this.startPos.ch){
            this.writtenSinceStart = document.getRange(this.startPos, cursorPos);
        } else{
            return false;
        }
        
        return true;
        
    };
    
    /**
     * Gets the text of the current document.
     * 
     * @returns {String} Text of the current document
     */
    LESSHint.prototype.getText = function() {
        
        var text = this.editor.document.getText();
        
        return text;
        
    };
    
    /**
     * Returns all matches of the RegExp in the text
     * @param   {RegExp} regex The RegExp which should be used
     * @param   {String} text  The searchable string
     * @returns {Array}  All matches of the RegExp in the string
     */
    LESSHint.prototype.getAll = function(regex, text){
        
        var matches = [];
        
        var match;
        while ((match = regex.exec(text)) !== null) {
            
            matches.push(match);
            
        }
        
        return matches;
        
    };
    
    /**
     * Filters the list of hints by the already written part
     * 
     * @param   {Array} matches Array of matches
     * @returns {Array} the filtered Array
     */
    LESSHint.prototype.filterHints = function(matches){

        var written = this.writtenSinceStart.toLowerCase().split("");
        
        matches = matches.filter(function(match){
            
            var hint = match[1].toLowerCase();
            
            for(var i = 0; i < written.length; i++){
                
                var index = hint.indexOf(written[i]);
                
                if(index === -1){
                    return false;
                } else{
                    hint = hint.substr(index + 1);
                }
            }
            
            return true;
        });
        
        return matches;

    };
    
    /**
     * Processes all the matches and prepares the hints and hintsHTML arrays
     * 
     * @param   {Array}    matches All the matches (already filtered)
     */
    LESSHint.prototype.processHints = function(matches){
        
        matches = matches.sort(function(match1, match2){
            
            var var1 = match1[1].toLowerCase();
            var var2 = match2[1].toLowerCase();
            
            if(var1 > var2){
                return 1;
            } else if(var1 < var2){
                return -1;
            } else{
                return 0;
            }
            
        });
        
        this.hints = matches.map(function(match){
            return match[1];
        });
        
        this.hintsHTML = matches.map(function(match){
            return match[1] + "<span style='color:#a0a0a0; margin-left: 10px'>" + match[2] + "</span>";
        });
        
    };
    
    /**
     * Register the HintProvider
     */
    AppInit.appReady(function () {
        var lessHints = new LESSHint();
        CodeHintManager.registerHintProvider(lessHints, ["less"], 0);
    });
});
