import { utils as U }                     from 'evisit-js-utils';
import React                              from 'react';
import { componentFactory }               from '@react-ameliorate/core';
import { View, TouchableWithoutFeedback } from '@react-ameliorate/native-shims';
import { ChildHandler }                   from '@react-ameliorate/mixin-child-handler';
import { TransitionGroup }                from '@react-ameliorate/component-transition-group';
import {
  findDOMNode,
  isDescendantElement,
  areObjectsEqualShallow,
  calculateObjectDifferences
}                                         from '@react-ameliorate/utils';
import styleSheet                         from './overlay-styles';

const SIDE_VALUES = {
        left: -1,
        right: 1,
        top: -1,
        bottom: 1,
        center: 0
      };

function getSideValue(side, negate) {
  var value = SIDE_VALUES[side];
  if (!value)
    value = 0;

  return (negate) ? (value * -1) : value;
}

function getSimpleSide(anchorPos, childPos) {
      if (!anchorPos || !anchorPos.x || !anchorPos.y || !childPos || !childPos.x || !childPos.y)
        return [ null, null, null ];

      var anchorSideX = getSideValue(anchorPos.x.side),
          anchorSideY = getSideValue(anchorPos.y.side),
          popupSideX  = getSideValue(childPos.x.side, true),
          popupSideY  = getSideValue(childPos.y.side, true),
          horizontal  = anchorSideX + popupSideX,
          vertical    = anchorSideY + popupSideY,
          sideX       = null,
          sideY       = null,
          values      = {
            horizontal,
            vertical,
            popupSideX,
            popupSideY,
            anchorSideX,
            anchorSideY
          };

      if (horizontal === -2 || horizontal === 2)
        sideX = (horizontal === 2) ? 'right' : 'left';

      if (vertical === -2 || vertical === 2)
        sideY = (vertical === 2) ? 'bottom' : 'top';

      return [ sideX, sideY, values ];
    }

function getRectPositionOffset(anchorRect, childRect, positionKeys, isTarget) {
  const getSideAndOffset = (key) => {
    if (!key)
      return;

    var offset = '',
        side;

    ('' + key).trim().replace(/^(left|bottom|right|top|centerV|centerH)([+-].*)?$/i, (m, _side, _offset) => {
      side = _side.toLowerCase();

      if (_offset) {
        offset = _offset.trim().replace(/^\++/g, '');
        if (offset && !offset.match(/[^\d.-]/))
          offset = `${offset}px`;
      }
    });

    if (!side)
      return;

    return { side, offset };
  };

  var x, y, position;
  for (var i = 0, il = positionKeys.length; i < il; i++) {
    var info = getSideAndOffset(positionKeys[i]);
    if (!info)
      continue;

    var side = info.side,
        transform = 0;

    if (side === 'left' || side === 'right' || side === 'centerh') {
      position = (side === 'centerh') ? (anchorRect.left + anchorRect.width * 0.5) : anchorRect[side];
      side = (side === 'centerh') ? 'center' : side;

      if (isTarget && side === 'right')
        transform = -childRect.width;
      else if (isTarget && side === 'center')
        transform = -(childRect.width * 0.5);

      x = { position: position + transform, offset: info.offset, side };
    } else {
      position = (side === 'centerv') ? (anchorRect.top + anchorRect.height * 0.5) : anchorRect[side];
      side = (side === 'centerv') ? 'center' : side;

      if (isTarget && side === 'bottom')
        transform = -childRect.height;
      else if (isTarget && side === 'center')
        transform = -(childRect.height * 0.5);

      y = { position: position + transform, offset: info.offset, side };
    }
  }

  return { x, y };
}

function calculateAnchorPosition(childElem, anchorElem, _anchorPosition) {
  const notResolvedYet = {
    style: { opacity: 0 }
  };

  if (!anchorElem || typeof anchorElem.getBoundingClientRect !== 'function')
    return notResolvedYet;

  var anchorPosition = _anchorPosition || {},
      anchorPositionKeys = Object.keys(anchorPosition);

  if (anchorPositionKeys.length !== 2) {
    anchorPosition = {
      'bottom': 'top',
      'left': 'left'
    };

    anchorPositionKeys = Object.keys(anchorPosition);
  }

  var anchorRect = anchorElem.getBoundingClientRect();
  if (!anchorRect)
    return notResolvedYet;

  var childRect = childElem.getBoundingClientRect();
  if (!childRect)
    return notResolvedYet;

  var anchorPos = getRectPositionOffset(anchorRect, childRect, anchorPositionKeys),
      childPos = getRectPositionOffset(anchorRect, childRect, anchorPositionKeys.map((key) => anchorPosition[key]), true),
      finalStyle = {};

  if (!childPos.x || !childPos.y || !anchorPos.x || !anchorPos.y)
    return notResolvedYet;

  finalStyle.left = anchorPos.x.position;
  if (childPos.x.offset)
    finalStyle['marginLeft'] = childPos.x.offset;

  finalStyle.top = anchorPos.y.position;
  if (childPos.y.offset)
    finalStyle['marginTop'] = childPos.y.offset;

  return {
    anchor: {
      position: anchorPos,
      rect: anchorRect,
      element: anchorElem
    },
    position: childPos,
    side: getSimpleSide(anchorPos, childPos),
    style: finalStyle
  };
}

function defaultPositioner(props, child, _opts) {
  if (!child.anchor)
    return;

  return calculateAnchorPosition.call(this, child.self, child.anchor, props.anchorPosition);
}

export const Overlay = componentFactory('Overlay', ({ Parent, componentName }) => {
  return class Overlay extends Parent {
    static styleSheet = styleSheet;

    resolveState() {
      return {
        ...super.resolveState.apply(this, arguments),
        ...this.getState({
          children: []
        })
      };
    }

    componentMounted() {
      console.log('OVERLAY HAS MOUNTED!!!');
    }

    // _debugStateUpdates(newState, oldState) {
    //   if (newState.children !== oldState.children)
    //     console.trace('Children: ', newState.children, oldState.children);
    // }

    onWindowResize() {
      this.forceUpdate();
    }

    //###if(!MOBILE){###//
    onPress(event) {
      var nativeEvent = event && event.nativeEvent,
          rootElement = this.getReference('overlayRoot');

      if (!nativeEvent || !rootElement)
        return;

      if (isDescendantElement(rootElement, nativeEvent.target))
        return;

      this.closeAll();
    }
    //###}###//

    onKeyDown(event) {
      var nativeEvent = (event && event.nativeEvent);
      if (nativeEvent && nativeEvent.code === 'Escape')
        this.closeAll();
    }

    //###if(!MOBILE){###//
    componentMounted() {
      window.addEventListener('resize', this.onWindowResize);
    }

    componentUnmounting() {
      window.removeEventListener('resize', this.onWindowResize);
    }
    //###}###//

    provideContext() {
      return {
        _raOverlay: this,
        _raPaperContext: this
      };
    }

    closeAll() {
      this.setState({ children: this.requestChildrenClose(undefined, undefined, 'close') });
    }

    requestChildrenClose(_children, isException, sourceAction) {
      var children = (_children) ? _children : this.getState('children', []);

      return children.filter((thisChild) => {
        if (!thisChild)
          return false;

        const shouldRemove = () => {
          if (typeof isException === 'function' && isException(thisChild))
            return true;

          var onShouldClose = (thisChild.props && thisChild.props.onShouldClose);
          if (typeof onShouldClose === 'function' && !onShouldClose.call(this, { child: thisChild, action: sourceAction }))
            return true;

          return false;
        };

        var shouldStay = shouldRemove();
        return shouldStay;
      });
    }

    findAnchor(_anchor) {
      var anchor = _anchor;
      if (U.instanceOf(anchor, 'string', 'number', 'boolean')) {
        anchor = this._findComponentReference(('' + anchor));
        if (anchor && anchor._raComponent)
          anchor = anchor._getReactComponent();
      }

      //###if(!MOBILE){###//
      anchor = (anchor) ? findDOMNode(anchor) : null;
      //###}###//

      return anchor;
    }

    addChild(child) {
      const comparePropsHaveChanged = (oldChild, newChild) => {
        var propsDiffer = !areObjectsEqualShallow(oldChild.props, newChild.props);

        if (propsDiffer) {
          var anchorPositionDiffers = !areObjectsEqualShallow(oldChild.props.anchorPosition, newChild.props.anchorPosition),
              positionDiffers       = calculateObjectDifferences(oldChild.position, newChild.position);

          return (anchorPositionDiffers || positionDiffers);
        }

        return false;
      };

      if (!child)
        return;

      var children = this.getState('children', []).slice(),
          index = children.findIndex((thisChild) => (thisChild.props.id === child.props.id || thisChild === child));

      if (index < 0)
        children.push(child);
      else
        children[index] = child;

      this.setState({ children: this.requestChildrenClose(children, (childInstance) => (childInstance === child), 'add') });
    }

    removeChild(child) {
      var children = this.getState('children', []),
          index = children.findIndex((thisChild) => (thisChild.props.id === child.props.id || thisChild === child));

      if (index >= 0) {
        children = children.slice();
        children.splice(index, 1);

        this.setState({ children });
      }
    }

    _getChildFromStateObject(stateObject) {
      if (!stateObject)
        return;

      return stateObject.instance;
    }

    _getChildPropsFromChild(child) {
      if (!child)
        return;

      return child.props;
    }

    _getChildPosition(child) {
      if (!child)
        return {};

      var childProps = this._getChildPropsFromChild(child),
          position,
          positionFunc = (typeof childProps.position === 'function') ? childProps.position : defaultPositioner;

      if (typeof positionFunc === 'function')
        position = positionFunc.call(this, childProps, child, { defaultPositioner });

      return position || {};
    }

    callProxyToOriginalEvent(eventName, stateObject) {
      var child = this._getChildFromStateObject(stateObject);
      if (!child)
        return;

      var childProps = this._getChildPropsFromChild(child),
          func = child[eventName] || childProps[eventName];

      if (typeof func === 'function')
        func.call(this, Object.assign({}, stateObject || {}, childProps));
    }

    // onChildUpdated(oldChild, newChild) {
    //   return this.callProxyToOriginalEvent('onChildUpdated', {
    //     _anchor: oldChild.anchor,
    //     _position: oldChild.position
    //   }, newChild);
    // }

    onChildEntering(stateObject) {
      return this.callProxyToOriginalEvent('onEntering', stateObject);
    }

    onChildMounted(stateObject) {
      return this.callProxyToOriginalEvent('onMounted', stateObject);
    }

    onChildEntered(stateObject) {
      return this.callProxyToOriginalEvent('onEntered', stateObject);
    }

    onChildLeaving(stateObject) {
      return this.callProxyToOriginalEvent('onLeaving', stateObject);
    }

    onChildLeft(stateObject) {
      return this.callProxyToOriginalEvent('onLeft', stateObject);
    }

    onAnimationStyle(stateObject) {
      var child = this._getChildFromStateObject(stateObject);
      if (!child)
        return;

      var childProps = this._getChildPropsFromChild(child),
          position = this._getChildPosition(child),
          anchor = (position.anchor) ? position.anchor : { element: childProps.anchor },
          extraStyle = (typeof childProps.calculateStyle === 'function') ? childProps.calculateStyle(Object.assign({}, stateObject, { anchor, position })) : null,
          childStyle = this.style(
            'childContainer',
            childProps.style,
            {
              opacity: stateObject.animation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1]
              })
            },
            (position.style) ? position.style : this.style('defaultPaperStyle'),
            extraStyle,
            //(!child.ready || !child.layout) ? { opacity: 0 } : null
          );

      console.log('POSITION STYLE: ', position.style);

      return childStyle;
    }

    getDOMNode() {
      var ref = this.getReference('_rootView');
      if (!ref)
        return null;

      return findDOMNode(ref);
    }

    renderContent(_children) {
      var overlayChildren = this.getState('children', []),
          hasChildren = !!(overlayChildren && overlayChildren.length);

      return (
        <View
          className={this.getRootClassName(componentName, 'children')}
          style={this.style('internalContainer', this.props.containerStyle)}
          ref={this.captureReference('_rootView')}
        >
          {this.getChildren(_children)}

          <TransitionGroup
            className={this.getRootClassName(componentName, 'overlay')}
            style={this.style('overlay', (hasChildren) ? 'containerHasChildren' : 'containerNoChildren')}
            onAnimationStyle={this.onAnimationStyle}
            onEntering={this.onChildEntering}
            onMounted={this.onChildMounted}
            onEntered={this.onChildEntered}
            onLeaving={this.onChildLeaving}
            onLeft={this.onChildLeft}
            ref={this.captureReference('overlayRoot', findDOMNode)}
            pointerEvents="box-none"
          >
            {overlayChildren}
          </TransitionGroup>
        </View>
      );
    }

    render(_children) {
      //###if(MOBILE){###//
      return super.render(this.renderContent(_children));
      //###}else{###//
      return super.render(
        <TouchableWithoutFeedback
          className={this.getRootClassName(componentName)}
          style={this.style('container', this.props.style)}
          onPress={this.onPress}
          onKeyDown={this.onKeyDown}
          tabIndex="-1"
        >
          {this.renderContent(_children)}
        </TouchableWithoutFeedback>
      );
      //###}###//
    }
  };
}, { mixins: [ ChildHandler ] });

export { styleSheet as overlayStyles };
