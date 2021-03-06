/*
    Weave (Web-based Analysis and Visualization Environment)
    Copyright (C) 2008-2011 University of Massachusetts Lowell

    This file is a part of Weave.

    Weave is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License, Version 3,
    as published by the Free Software Foundation.

    Weave is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Weave.  If not, see <http://www.gnu.org/licenses/>.
*/



/**
 * This object links to an internal ILinkableObject.
 * The internal object can be either a local one or a global one identified by a global name.
 *
 * @author adufilie
 * @author sanjay1909
 */
// namespace

if (!this.weavecore)
    this.weavecore = {};
(function () {
    /**
     * @param typeRestriction If specified, this will limit the type of objects that can be added to this LinkableHashMap.
     */
    function LinkableDynamicObject(typeRestriction) {
        if (typeRestriction === undefined) typeRestriction = null;
        // this is a constraint on the type of object that can be linked
        this._typeRestrictionClassName;
        this._typeRestriction = typeRestriction;
        // when this is true, the linked object cannot be changed
        this._locked = false;

        weavecore.CallbackCollection.call(this, typeRestriction);
        if (typeRestriction)
            this._typeRestrictionClassName = typeRestriction.constructor.name;
    }

    // the callback collection for this object
    // private const
    Object.defineProperty(this, '_cc', {
        value: WeaveAPI.SessionManager.registerDisposableChild(this, new weavecore.CallbackCollection()),
        writable: false
    })

    Object.defineProperty(LinkableDynamicObject, 'ARRAY_CLASS_NAME', {
        value: 'Array'
    });

    /**
     * @inheritDoc
     */
    Object.defineProperty(this, 'internalObject', {
        get: function () {
            return this.target;
        }
    })

    // override public
    Object.defineProperty(this, 'targetPath', {

        set: function (path) {
            if (this._locked)
                return;
            weavecore.LinkableWatcher.prototype.targetPath = path;
        },
        configurable: true
    });

    // override public
    Object.defineProperty(this, 'target', {

        set: function (newTarget) {
            if (this._locked)
                return;

            if (!newTarget) {
                weavecore.LinkableWatcher.prototype.target = null;
                return;
            }

            this._cc.delayCallbacks();

            // if the target can be found by a path, use the path
            var sm = WeaveAPI.SessionManager;
            var path = sm.getPath(WeaveAPI.globalHashMap, newTarget);
            if (path) {
                this.targetPath = path;
            } else {
                // it's ok to assign a local object that we own or that doesn't have an owner yet
                // otherwise, unset the target
                var owner = sm.getLinkableOwner(newTarget);
                if (owner === this || !owner)
                    weavecore.LinkableWatcher.prototype.target = newTarget;
                else
                    weavecore.LinkableWatcher.prototype.target = null;
            }

            this._cc.resumeCallbacks();
        },
        configurable: true
    });


    Object.defineProperty(this, 'globalName', {
        /**
         * This is the name of the linked global object, or null if the internal object is local.
         */
        get: function () {
            if (this._targetPath && this._targetPath.length == 1)
                return this._targetPath[0];
            return null;
        },
        /**
         * This function will change the internalObject if the new globalName is different, unless this object is locked.
         * If a new global name is given, the session state of the new global object will take precedence.
         * @param newGlobalName This is the name of the global object to link to, or null to unlink from the current global object.
         */
        set: function (newGlobalName) {
            if (this._locked)
                return;

            // change empty string to null
            if (!newGlobalName)
                newGlobalName = null;

            var oldGlobalName = this.globalName;
            if (oldGlobalName === newGlobalName)
                return;

            this._cc.delayCallbacks();

            if (newGlobalName === null || newGlobalName === undefined) {
                // unlink from global object and copy session state into a local object
                this.requestLocalObjectCopy(this.internalObject);
            } else {
                // when switcing from a local object to a global one that doesn't exist yet, copy the local object
                if (this.target && !this.targetPath && !WeaveAPI.globalHashMap.getObject(newGlobalName))
                    WeaveAPI.globalHashMap.requestObjectCopy(newGlobalName, this.internalObject);

                // link to new global name
                this.targetPath = [newGlobalName];
            }

            this._cc.resumeCallbacks();
        }
    });




    /**
     * @inheritDoc
     */
    Object.defineProperty(this, 'locked', {
        get: function () {
            return this.locked;
        }

    });

    LinkableDynamicObject.prototype = new weavecore.LinkableWatcher();
    LinkableDynamicObject.prototype.constructor = LinkableDynamicObject;

    var p = LinkableDynamicObject.prototype;


    p.lock = function () {
        this._locked = true;
    }

    /**
     * @inheritDoc
     */
    //public

    p.getSessionState = function () {
        var obj = this.targetPath || this.target;
        if (!obj)
            return [];

        var className = obj.constructor.name;
        var sessionState = obj || WeaveAPI.SessionManager.getSessionState(obj);
        return [weavecore.DynamicState.create(null, className, sessionState)];
    }

    /**
     * @inheritDoc
     */
    //public

    p.setSessionState = function (newState, removeMissingDynamicObjects) {
        //console.log(debugId(this), removeMissingDynamicObjects ? 'diff' : 'state', Compiler.stringify(newState, null, '\t'));

        // special case - no change
        if (newState === null || newState === undefined)
            return;

        try {
            // make sure callbacks only run once
            this._cc.delayCallbacks();

            // stop if there are no items
            if (!newState.length) {
                if (removeMissingDynamicObjects)
                    target = null;
                return;
            }

            // if it's not a dynamic state array, treat it as a path
            if (!weavecore.DynamicState.isDynamicStateArray(newState)) {
                this.targetPath = newState;
                return;
            }

            // if there is more than one item, it's in a deprecated format
            /*if (newState.length > 1) {
                handleDeprecatedSessionState(newState, removeMissingDynamicObjects);
                return;
            }*/

            var dynamicState = newState[0];
            var className = dynamicState[weavecore.DynamicState.CLASS_NAME];
            var objectName = dynamicState[weavecore.DynamicState.OBJECT_NAME];
            var sessionState = dynamicState[weavecore.DynamicState.SESSION_STATE];

            // backwards compatibility
            /*if (className == 'weave.core::GlobalObjectReference' || className == 'GlobalObjectReference') {
                className = ARRAY_CLASS_NAME;
                sessionState = [objectName];
            }*/

            if (className === ARRAY_CLASS_NAME || (!className && this.targetPath))
                this.targetPath = sessionState;
            else if (className === SessionManager.DIFF_DELETE)
                this.target = null;
            else {
                var prevTarget = this.target;
                // if className is not specified, make no change unless removeMissingDynamicObjects is true
                if (className || removeMissingDynamicObjects)
                    this._setLocalObjectType(className);
                try {
                    var classDef = eval("weavecore." + className);
                } catch (e) {
                    classDef = eval("weavedata." + className);
                }

                if ((!className && this.target) || (classDef && this.target instanceof classDef))
                    WeaveAPI.SessionManager.setSessionState(this.target, sessionState, prevTarget !== this.target || removeMissingDynamicObjects);
            }
        } finally {
            // allow callbacks to run once now
            this._cc.resumeCallbacks();
        }
    }





    // override protected

    p.internalSetTarget = function (newTarget) {
        // don't allow recursive linking
        if (newTarget === this || WeaveAPI.SessionManager.getLinkableDescendants(newTarget, LinkableDynamicObject).indexOf(this) >= 0)
            newTarget = null;

        weavecore.LinkableWatcher.prototype.internalSetTarget(newTarget);
    }



    //private

    p._setLocalObjectType = function (className) {
        // stop if locked
        if (this._locked)
            return;

        this._cc.delayCallbacks();

        this.targetPath = null;

        var classDef = eval('weavecore.' + className);
        if (classDef instanceof weavecore.ILinkableObject && (this._typeRestriction === null || this._typeRestriction === undefined || classDef instanceof this._typeRestriction)) {

            var obj = target;
            if (!obj || obj.constructor !== classDef)
                weavecore.LinkableWatcher.prototype.target = new classDef();
        } else {
            weavecore.LinkableWatcher.prototype.target = null;
        }

        _cc.resumeCallbacks();
    }

    /**
     * @inheritDoc
     */


    p.requestLocalObject = function (objectType, lockObject) {
        this._cc.delayCallbacks();

        if (objectType)
            this._setLocalObjectType(objectType.constructor.name);
        else
            this.target = null;

        if (lockObject)
            this._locked = true;

        this._cc.resumeCallbacks();

        return target;
    }

    /**
     * @inheritDoc
     */
    p.requestGlobalObject = function (name, objectType, lockObject) {
        if (!name)
            return this.requestLocalObject(objectType, lockObject);

        if (!this._locked) {
            this._cc.delayCallbacks();

            this.targetPath = [name];
            WeaveAPI.globalHashMap.requestObject(name, objectType, lockObject);
            if (lockObject)
                this._locked = true;

            this._cc.resumeCallbacks();
        }

        return this.target;
    }

    /**
     * @inheritDoc
     */
    p.requestLocalObjectCopy = function (objectToCopy) {
        this._cc.delayCallbacks(); // make sure callbacks only trigger once
        var classDef = objectToCopy ? objectToCopy.constructor : null;
        var object = this.requestLocalObject(classDef, false);
        if (object !== null && object !== undefined && objectToCopy !== null && objectToCopy !== undefined) {
            var state = WeaveAPI.SessionManager.getSessionState(objectToCopy);
            WeaveAPI.SessionManager.setSessionState(object, state, true);
        }
        this._cc.resumeCallbacks();
    }


    p.removeObject = function () {
        if (!this._locked)
            weavecore.LinkableWatcher.prototype.target = null;
    }

    p.dispose = function () {
        // explicitly dispose the CallbackCollection before anything else
        this._cc.dispose();
        weavecore.LinkableWatcher.prototype.dispose();
    }

    weavecore.LinkableDynamicObject = LinkableDynamicObject;


}());
