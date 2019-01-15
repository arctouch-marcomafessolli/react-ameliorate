import { createStyleSheet } from '@base';

export default createStyleSheet(function(theme) {
  const MODAL_BUTTON_SPACING = Math.round(theme.DEFAULT_PADDING * 0.5);

  return {
    MODAL_BUTTON_SPACING,
    container: {
      backgroundColor: theme.contrastColor(theme.MAIN_COLOR),
      minWidth: theme.SCREEN_WIDTH * 0.18,
      minHeight: theme.SCREEN_HEIGHT * 0.08,
      borderRadius: theme.DEFAULT_RADIUS,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: theme.blendColors(theme.contrastColor(theme.MAIN_COLOR), theme.transparentColor(theme.GREY02_COLOR))
    }
  };
});