//###if(MOBILE) {###//
import { TextInput }              from 'react-native';
//###} else {###//
import { utils as U }             from 'evisit-js-utils';
import React                      from 'react';
import { flattenStyle }           from '../shim-utils';
import {
  preventEventDefault,
  stopEventPropagation,
  stopEventImmediatePropagation,
  assignRef
}                                 from '@react-ameliorate/utils';
import TextInputPropTypes         from '../prop-types/text-input';

class TextInputShim extends React.Component {
  constructor(props, ...args) {
    super(props, ...args);

    this.state = {
      value: props.defaultValue
    };

    // This is required to get Chrome to TRULY respect 'autoComplete="off"'
    // https://stackoverflow.com/questions/12374442/chrome-ignores-autocomplete-off
    this._autoCompleteRandomValue = U.uuid();
  }

  static propTypes = TextInputPropTypes;

  static getDerivedStateFromProps(nextProps, state) {
    var value = state.value;

    if (nextProps.value !== undefined)
      value = nextProps.value;

    return {
      value
    };
  }

  componentDidMount() {
    if (this.props.autoFocus === true && this._inputRef)
      this._inputRef.focus();

    if (this.props.multiline && this._inputRef) {
      this._inputRef.addEventListener('input', this.autoExpand);
      this.autoExpand();
    }
  }

  componentWillUnmount() {
    if (this._inputRef)
      this._inputRef.removeEventListener('input', this.autoExpand);
  }

  componentDidUpdate(prevProps) {
    if (this.props.multiline && prevProps.value !== this.props.value)
      this.autoExpand();

    if (!this._inputRef || prevProps.selection === this.props.selection)
      return;

    try {
      var selection = this.props.selection,
          start = (selection && selection.start),
          end   = (selection && selection.end);

      if (start == null)
        start = 999999999;

      if (end == null)
        end = start;

      this._inputRef.setSelectionRange(start, end);
    } catch (e) {}
  }

  autoExpand = () => {
    var textarea = this._inputRef;
    if (!textarea)
      return;

    textarea.style.height = 'initial';

    var computed = window.getComputedStyle(textarea),
        minHeight = parseInt(computed.getPropertyValue('min-height'), 10),
        height = Math.max(minHeight, textarea.scrollHeight - 10) - 2;

    textarea.style.height = height + 'px';
  }

  doSubmit = (event) => {
    if (typeof this.props.onSubmitEditing === 'function') {
      preventEventDefault(event);
      stopEventImmediatePropagation(event);

      this.props.onSubmitEditing.call(this, event);
    }

    if (this.props.blurOnSubmit && this._inputRef)
      this._inputRef.blur();
  };

  onChange = (event) => {
    var value = event && event.nativeEvent && event.nativeEvent.target && event.nativeEvent.target.value;
    if (!value)
      value = '';

    this.state.value = value;

    if (typeof this.props.onChange === 'function')
      this.props.onChange.call(this, event);

    if (typeof this.props.onChangeText === 'function')
      this.props.onChangeText.call(this, value, event);
  }

  onKeyDown = (event) => {
    if (typeof this.props.onKeyDown === 'function' && this.props.onKeyDown(event) === false) {
      stopEventPropagation(event);
      return;
    }

    // Keycode 9 never makes it to onKeyPress
    var nativeEvent = event.nativeEvent;
    if (nativeEvent.keyCode === 9)
      this.doSubmit(event);
  }

  onKeyUp = (event) => {
    if (typeof this.props.onKeyUp === 'function' && this.props.onKeyUp.call(this, event) === false) {
      stopEventPropagation(event);
      return;
    }
  }

  onKeyPress = (event) => {
    var nativeEvent = event.nativeEvent;

    if (typeof this.props.onKeyPress === 'function' && this.props.onKeyPress.call(this, event) === false) {
      stopEventPropagation(event);
      return;
    }

    if (!this.props.multiline && nativeEvent.keyCode === 13)
      this.doSubmit(event);
  }

  onFocus = (event) => {
    if (typeof this.props.onFocus === 'function')
      this.props.onFocus.call(this, event);
  }

  onBlur = (event) => {
    if (typeof this.props.onBlur === 'function')
      this.props.onBlur.call(this, event);
  }

  inputRef = (elem) => {
    this._inputRef = elem;

    if (elem && this.props.autoFocus === true)
      elem.focus();

    assignRef(this.props.inputRef, elem);
  }

  clear = () => {

  }

  focus = () => {
    if (!this._inputRef)
      return;

    this._inputRef.focus();
  }

  blur = () => {
    if (!this._inputRef)
      return;

    this._inputRef.blur();
  }

  render() {
    var providedProps = this.props,
        value = (providedProps.value !== undefined) ? providedProps.value : this.state.value,
        multiline = providedProps.multiline,
        autoComplete = ((providedProps.autoFill !== false && providedProps.name) ? (providedProps.name || providedProps.field) : undefined),
        props = {
          autoComplete: (!autoComplete) ? this._autoCompleteRandomValue : autoComplete,
          name: autoComplete,
          placeholder: providedProps.placeholder,
          onChange: this.onChange,
          onKeyDown: this.onKeyDown,
          onKeyUp: this.onKeyUp,
          onKeyPress: this.onKeyPress,
          onFocus: this.onFocus,
          onBlur: this.onBlur,
          ref: this.inputRef,
          maxLength: providedProps.maxLength,
          className: providedProps.className,
          readOnly: providedProps.readOnly,
          max: providedProps.max
        },
        elementName = (multiline) ? 'textarea' : 'input',
        baseStyle = [{
          // boxSizing: 'border-box',
          // display: 'flex',
          // flex: 1,
          // minHeight: 36,
          // minWidth: 50
        }, providedProps.style];

    if (value == null || (typeof value === 'number' && !isFinite(value)))
      value = '';
    else
      value = ('' + value);

    if (providedProps.editable === false)
      props.disabled = "disabled";

    props.value = value;

    if (!multiline)
      props.type = (providedProps.secureTextEntry) ? 'password' : 'text';
    else
      props.rows = 1;

    props.style = flattenStyle(baseStyle);

    return React.createElement(elementName, props);
  }
}

const TextInput = React.forwardRef((props, ref) => {
  return (<TextInputShim {...props} inputRef={ref}/>);
});
//###}###//

export {
  TextInput
};
