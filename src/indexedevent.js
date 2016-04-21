/**
 *  Copyright (c) 2015, The Regents of the University of California,
 *  through Lawrence Berkeley National Laboratory (subject to receipt
 *  of any required approvals from the U.S. Dept. of Energy).
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import _ from "underscore";
import Immutable from "immutable";
import Index from "./index";

function indexFromArgs(arg1, arg2) {
    if (_.isString(arg1)) {
        return new Index(arg1, arg2 || true);
    } else if (arg1 instanceof Index) {
        return arg1;
    } else {
        throw new Error(`Unable to get index from ${arg1}. Should be a string or Index.`);
    }
}

function dataFromArg(arg) {
    let data;
    if (_.isObject(arg)) {
        // Deeply convert the data to Immutable Map
        data = new Immutable.fromJS(arg);
    } else if (data instanceof Immutable.Map) {
        // Copy reference to the data
        data = arg;
    } else if (_.isNumber(arg) || _.isString(arg)) {
        // Just add it to the value key of a new Map
        // e.g. new Event(t, 25); -> t, {value: 25}
        data = new Immutable.Map({value: arg});
    } else {
        throw new Error(`Unable to interpret event data from ${arg}.`);
    }
    return data;
}

/**
 * An IndexedEvent uses an Index to specify a timerange over which the event
 * occurs and maps that to a data object representing some measurement or metric
 * during that time range.
 *
 * You can supply the index as a string or as an Index object.
 *
 * Example Indexes are:
 *     - 1d-1565 is the entire duration of the 1565th day since the UNIX epoch
 *     - 2014-03 is the entire duration of march in 2014
 *
 * The range, as expressed by the Index, is provided by the convenience method
 * `range()`, which returns a TimeRange instance. Alternatively the begin
 * and end times represented by the Index can be found with `begin()`
 * and `end()` respectively.
 *
 * The data is also specified during construction, and is generally expected to
 * be an object or an Immutable.Map. If an object is provided it will be stored
 * internally as an ImmutableMap. If the data provided is some other type then
 * it will be equivalent to supplying an object of `{value: data}`. Data may be
 * undefined.
 *
 * The get the data out of an IndexedEvent instance use `data()`. It will return
 * an Immutable.Map.
 */
class IndexedEvent {

    /**
     * The creation of an IndexedEvent is done by combining two parts:
     * the Index and the data.
     *
     * To construct you specify an Index, along with the data.
     *
     * The index may be an Index, or a string.
     *
     * To specify the data you can supply either:
     *     - a Javascript object containing key values pairs
     *     - an Immutable.Map, or
     *     - a simple type such as an integer. In the case of the simple type
     *       this is a shorthand for supplying {"value": v}.
     */
    constructor(arg1, arg2, arg3) {
        if (arg1 instanceof IndexedEvent) {
            const other = arg1;
            this._d = other._d;
            return;
        } else if (arg1 instanceof Immutable.Map) {
            this._d = arg1;
            return;
        }
        const index = indexFromArgs(arg1, arg3);
        const data = dataFromArg(arg2);
        this._d = new Immutable.Map({index, data});
    }

    toJSON() {
        return {
            index: this.indexAsString(),
            data: this.data().toJSON()
        };
    }

    toString() {
        return JSON.stringify(this.toJSON());
    }

    /**
     * Returns a flat array starting with the timestamp, followed by the values.
     */
    toPoint() {
        return [
            this.indexAsString(),
            ..._.values(this.data().toJSON())
        ];
    }

    /**
     * Returns the Index associated with the data in this Event
     * @return {Index} The Index
     */
    index() {
        return this._d.get("index");
    }

    /**
     * Sets the data of the event and returns a new IndexedEvent.
     */
    setData(data) {
        const d = this._d.set("data", dataFromArg(data));
        return new IndexedEvent(d);
    }

    /**
     * Access the event data
     * @return {Immutable.Map} Data for the Event
     */
    data() {
        return this._d.get("data");
    }

    /**
     * Returns the Index as a string, same as event.index().toString()
     * @return {string} The Index
     */
    indexAsString() {
        return this.index().asString();
    }

    /**
     * The TimeRange of this data, in UTC, as a string.
     * @return {string} TimeRange of this data.
     */
    timerangeAsUTCString() {
        return this.timerange().toUTCString();
    }

    /**
     * The TimeRange of this data, in Local time, as a string.
     * @return {string} TimeRange of this data.
     */
    timerangeAsLocalString() {
        return this.timerange().toLocalString();
    }

    /**
     * The TimeRange of this data
     * @return {TimeRange} TimeRange of this data.
     */
    timerange() {
        return this.index().asTimerange();
    }

    /**
     * The begin time of this Event
     * @return {Data} Begin time
     */
    begin() {
        return this.timerange().begin();
    }

    /**
     * The end time of this Event
     * @return {Data} End time
     */
    end() {
        return this.timerange().end();
    }

    /**
     * Alias for the begin() time.
     * @return {Data} Time representing this Event
     */
    timestamp() {
        return this.begin();
    }

    /**
     * Get specific data out of the Event. The data will be converted
     * to a js object. You can use a fieldSpec to address deep data.
     * A fieldSpec could be "a.b"
     */
    get(fieldSpec = ["value"]) {
        let v;
        if (_.isArray(fieldSpec)) {
            v = this.data().getIn(fieldSpec);
        } else if (_.isString(fieldSpec)) {
            const searchKeyPath = fieldSpec.split(".");
            v = this.data().getIn(searchKeyPath);
        }

        if (v instanceof Immutable.Map || v instanceof Immutable.List) {
            return v.toJS();
        }
        return v;
    }

    value(fieldSpec) {
        return this.get(fieldSpec);
    }
}

export default IndexedEvent;
