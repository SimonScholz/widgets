import { DNode } from '@dojo/framework/widget-core/interfaces';
import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { I18nMixin } from '@dojo/framework/widget-core/mixins/I18n';
import { ThemedMixin, ThemedProperties, theme } from '@dojo/framework/widget-core/mixins/Themed';
import Focus from '@dojo/framework/widget-core/meta/Focus';
import { v, w } from '@dojo/framework/widget-core/d';
import { uuid } from '@dojo/framework/core/util';
import { CustomAriaProperties } from '../common/interfaces';
import { formatAriaProperties, Keys } from '../common/util';
import commonBundle from '../common/nls/common';

import Icon from '../icon/index';
import * as fixedCss from './styles/dialog.m.css';
import * as css from '../theme/dialog.m.css';
import { GlobalEvent } from '../global-event/index';
import { customElement } from '@dojo/framework/widget-core/decorators/customElement';

/**
 * The role of this dialog, used for accessibility
 */
export type RoleType = 'dialog' | 'alertdialog';

/**
 * @type DialogProperties
 *
 * Properties that can be set on a Dialog component
 *
 * @property closeable          Determines whether the dialog can be closed
 * @property closeText          Hidden text used by screen readers to display for the close button
 * @property enterAnimation     CSS class to apply to the dialog when opened
 * @property exitAnimation      CSS class to apply to the dialog when closed
 * @property modal              Determines whether the dialog can be closed by clicking outside its content
 * @property onOpen             Called when the dialog opens
 * @property onRequestClose     Called when the dialog is closed
 * @property open               Determines whether the dialog is open or closed
 * @property role               Role of this dialog for accessibility, either 'alert' or 'dialog'
 * @property title              Title to show in the dialog title bar
 * @property underlay           Determines whether a semi-transparent background shows behind the dialog
 */
export interface DialogProperties extends ThemedProperties, CustomAriaProperties {
	closeable?: boolean;
	closeText?: string;
	enterAnimation?: string;
	exitAnimation?: string;
	modal?: boolean;
	onOpen?(): void;
	onRequestClose?(): void;
	open?: boolean;
	role?: RoleType;
	title?: string;
	underlay?: boolean;
}

export const ThemedBase = I18nMixin(ThemedMixin(WidgetBase));

@theme(css)
@customElement<DialogProperties>({
	tag: 'dojo-dialog',
	properties: [
		'theme',
		'aria',
		'extraClasses',
		'closeable',
		'modal',
		'open',
		'underlay',
		'classes'
	],
	attributes: [
		'title',
		'role',
		'exitAnimation',
		'enterAnimation',
		'closeText'
	],
	events: [
		'onOpen',
		'onRequestClose'
	]
})
export class DialogBase<P extends DialogProperties = DialogProperties> extends ThemedBase<P> {
	private _titleId = uuid();
	private _wasOpen: boolean | undefined;
	private _callFocus = false;
	private _initialFocusSet = false;

	private _onCloseClick(event: MouseEvent) {
		event.stopPropagation();
		this._close();
	}

	private _checkFocus() {
		const {
			modal,
			open
		} = this.properties;

		// only handle focus for open dialog
		if (!open) {
			return;
		}

		const dialogFocus = this.meta(Focus).get('main');
		if (dialogFocus.containsFocus) {
			this._callFocus = false;
			this._initialFocusSet = true;
		}

		// handle if the dialog is open and loses focus
		if (this._initialFocusSet && !dialogFocus.containsFocus) {
			modal ? this._callFocus = true : this._close();
		}

		if (this._callFocus) {
			this.meta(Focus).set('main');
		}
	}

	private _close() {
		const {
			closeable = true,
			onRequestClose
		} = this.properties;

		closeable && onRequestClose && onRequestClose();
	}

	private _onUnderlayClick(event: MouseEvent) {
		event.stopPropagation();
		!this.properties.modal && this._close();
	}

	private _onKeyUp = (event: KeyboardEvent): void => {
		event.stopPropagation();
		if (event.which === Keys.Escape) {
			this._close();
		}
	}

	private _onOpen() {
		const { onOpen } = this.properties;
		this._callFocus = true;
		this._initialFocusSet = false;
		onOpen && onOpen();
	}

	protected getContent(): DNode {
		return v('div', {
			classes: this.theme(css.content),
			key: 'content'
		}, this.children);
	}

	protected renderTitle(): DNode {
		const { title = '' } = this.properties;
		return v('div', { id: this._titleId }, [ title ]);
	}

	protected renderUnderlay(): DNode {
		const { underlay } = this.properties;
		return v('div', {
			classes: [ this.theme(underlay ? css.underlayVisible : null), fixedCss.underlay ],
			enterAnimation: this.theme(css.underlayEnter) || undefined,
			exitAnimation: this.theme(css.underlayExit) || undefined,
			key: 'underlay',
			onclick: this._onUnderlayClick
		});
	}

	protected render(): DNode {
		let {
			aria = {},
			closeable = true,
			closeText,
			enterAnimation = this.theme(css.enter) || undefined,
			exitAnimation = this.theme(css.exit) || undefined,
			modal,
			open = false,
			role = 'dialog',
			title = '',
			theme,
			classes
		} = this.properties;

		open && !this._wasOpen && this._onOpen();
		this._wasOpen = open;

		this._checkFocus();

		if (!closeText) {
			const { messages } = this.localizeBundle(commonBundle);
			closeText = `${messages.close} ${title}`;
		}

		return v('div', {
			classes: this.theme(css.root)
		}, open ? [
			w(GlobalEvent, { key: 'global', document: { keyup: this._onKeyUp } }),
			this.renderUnderlay(),
			v('div', {
				...formatAriaProperties(aria),
				'aria-labelledby': this._titleId,
				classes: this.theme(css.main),
				enterAnimation,
				exitAnimation,
				key: 'main',
				role,
				tabIndex: -1
			}, [
				v('div', {
					classes: this.theme(css.title),
					key: 'title'
				}, [
					this.renderTitle(),
					closeable ? v('button', {
						classes: this.theme(css.close),
						type: 'button',
						onclick: this._onCloseClick
					}, [
						closeText,
						w(Icon, { type: 'closeIcon', theme, classes })
					]) : null
				]),
				this.getContent()
			])
		] : []);
	}
}

export default class Dialog extends DialogBase<DialogProperties> {}
