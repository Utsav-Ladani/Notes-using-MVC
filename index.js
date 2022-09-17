"use strict";

const DOCS = `
\n
Docs
    ## for big heading ##
    !! for small heading !!
    ** for bold text **
    ++ for italic text ++
    -- for highlight text --
    == for list ==
    || for quote ||
    / is escape sequence 
`;

function _textToDOM(text) {
    text += " ";
    const n = text.length;
    const tagStack = [" "];

    function rec(pos) {
        let tempText = "";
        const children = document.createDocumentFragment();

        if (pos >= n - 1) return { nodes: children, newPos: n };

        for (let i = pos; i < n - 1; i++) {

            let tag;
            switch (text[i] + text[i + 1]) {
                case "**":
                    tag = "b";
                    break;

                case "++":
                    tag = "i";
                    break;

                case "--":
                    tag = "u";
                    break;

                case "==":
                    tag = "li";
                    break;

                case "##":
                    tag = "h1";
                    break;

                case "!!":
                    tag = "h2";
                    break;

                case "||":
                    tag = "p";
                    break;

                // "/" is escape sequence for this parser
                default:
                    tag = null;
                    if (text[i] == '/') i++;
                    tempText += text[i];
            }

            if (tag) {
                const textNode = document.createTextNode(tempText);
                children.appendChild(textNode);
                tempText = "";

                if (tagStack[tagStack.length - 1] == tag) {
                    tagStack.pop();

                    const node = document.createElement(tag);
                    node.className = 'tag-' + tag;
                    node.append(children);
                    return { nodes: node, newPos: ++i };
                }
                else {
                    tagStack.push(tag);
                    let { nodes, newPos } = rec(i + 2);
                    i = newPos;
                    children.appendChild(nodes);
                }
            }
        }

        const textNode = document.createTextNode(tempText);
        children.appendChild(textNode);
        return { nodes: children, newPos: n };
    }

    const { nodes } = rec(0);
    return nodes;
}


class Model {
    constructor() {
        this.notes = JSON.parse(window.localStorage.getItem("Notes-MVC")) || [];
    }

    findById(id) {
        return this.notes.filter((note) => note.id === id)[0];
    }

    addNote(noteText) {
        const note = {
            id: this.notes.length == 0 ? 1 : (this.notes[this.notes.length - 1].id + 1),
            text: noteText,
        }

        this.notes.push(note);

        this._commit(this.notes);
    }

    editNote(id, updatedText) {
        this.notes = this.notes.map((note) =>
            note.id === id ? { id: id, text: updatedText ? updatedText : note.text } : note
        )

        this._commit(this.notes);
    }

    deleteNote(id) {
        this.notes = this.notes.filter((note) => note.id !== id);

        this._commit(this.notes);
    }

    bindNoteListChanged(callback) {
        this.onNoteListChanged = callback;
    }

    _commit(notes) {
        this.onNoteListChanged(notes);
        window.localStorage.setItem("Notes-MVC", JSON.stringify(notes));
    }
}

class Note {
    constructor(note) {
        this.note = note;

        this.li = this.createElement("li");
        this.li.classList.add("note");

        this.editable = this.createElement('div', 'editable')
        this.editable.contentEditable = false;
        this.editable.append(_textToDOM(this.note.text));

        this.editBtn = this.createElement('button', 'btn');
        this.editBtn.textContent = 'Edit';

        this.deleteBtn = this.createElement('button', 'btn');
        this.deleteBtn.textContent = 'Delete';

        this.li.append(this.editable, this.editBtn, this.deleteBtn);

        this._tempNoteText = "";
        this._initLocalListener();
    }

    createElement(tag, className) {
        const element = document.createElement(tag);
        if (className) element.classList.add(className);

        return element;
    }

    get liDOM() {
        return this.li;
    }

    bindEditStart(handler) {
        this.editBtn.onclick = () => {
            this.editable.contentEditable = true;
            this.editable.innerText = handler(this.note.id).text;
            this.editable.focus();
        }
    }

    _initLocalListener() {
        this.editable.oninput = (e) => {
            this._tempNoteText = e.target.innerText;
        }
    }

    bindEditFinish(handler) {
        this.editable.addEventListener("focusout", () => {
            handler(this.note.id, this._tempNoteText.trim());
            this.editable.contentEditable = false;
            this._tempNoteText = "";
        })
    }

    bindDeleteNote(handler) {
        this.deleteBtn.onclick = () => {
            handler(this.note.id);
        }
    }

}


class View {
    constructor() {
        this.root = this.getElement("#root");

        this.title = this.createElement("h1", 'logo');
        this.title.textContent = "Notes";

        this.form = this.createElement("form");
        this.form.classList.add("form");

        this.input = this.createElement("textarea", "editor");
        this.input.name = "note";
        this.input.placeholder = "Write your note here... " + DOCS;

        this.preview = this.createElement("div", "preview");
        this._initLocalListener();

        this.submitBtn = this.createElement("button", "btn");
        this.submitBtn.type = "submit";
        this.submitBtn.textContent = "Add";

        this.noteList = this.createElement("ul", "note-list");

        this.form.append(this.input, this.preview, this.submitBtn);

        this.root.append(this.title, this.form, this.noteList);

    }

    createElement(tag, className) {
        const element = document.createElement(tag);
        if (className) element.classList.add(className);

        return element;
    }

    getElement(selector) {
        const element = document.querySelector(selector);

        return element;
    }

    get _noteText() {
        return this.input.value;
    }

    _resetInput() {
        this.input.value = '';
        this.preview.replaceChildren(document.createDocumentFragment());
    }

    _initLocalListener() {
        this.input.oninput = (e) => {
            this.preview.replaceChildren(_textToDOM(e.target.value));
        }
    }

    displaynotes(notes) {
        this.noteList.replaceChildren(document.createDocumentFragment());

        if (notes.length === 0) {
            const p = this.createElement("p", "empty")
            p.textContent = "Nothing to do! Add a task?"
            this.noteList.append(p)
        }
        else {
            notes.forEach(note => {
                const noteLI = new Note(note);
                noteLI.bindEditStart(this.editStartHandler);
                noteLI.bindEditFinish(this.editFinishHandler);
                noteLI.bindDeleteNote(this.deleteHandler);
                this.noteList.append(noteLI.liDOM);
            });
        }
    }

    bindAddNote(handler) {
        this.form.addEventListener('submit', e => {
            e.preventDefault();

            if (this._noteText.trim()) {
                handler(this._noteText.trim())
            }

            this._resetInput();
        })
    }

    bindEditStart(handler) {
        this.editStartHandler = handler;
    }

    bindEditFinish(handler) {
        this.editFinishHandler = handler;
    }

    bindDeleteNote(handler) {
        this.deleteHandler = handler;
    }
}

class Controller {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        this.view.bindAddNote(this.handleAddNote);
        this.view.bindDeleteNote(this.handleDeleteNote);
        this.view.bindEditStart(this.handleEditStart);
        this.view.bindEditFinish(this.handleEditFinishNote);

        this.model.bindNoteListChanged(this.onNoteListChanged);

        this.onNoteListChanged(this.model.notes);
    }

    onNoteListChanged = (notes) => {
        this.view.displaynotes(notes);
    }

    handleAddNote = (noteText) => {
        this.model.addNote(noteText)
    }

    handleEditStart = (id) => {
        return this.model.findById(id);
    }

    handleEditFinishNote = (id, noteText) => {
        this.model.editNote(id, noteText)
    }

    handleDeleteNote = (id) => {
        this.model.deleteNote(id)
    }
}

let app = new Controller(new Model(), new View());