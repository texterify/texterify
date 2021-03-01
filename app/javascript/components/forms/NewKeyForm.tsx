import { QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Checkbox, Form, Input, Tooltip } from "antd";
import { FormInstance } from "antd/lib/form";
import * as React from "react";
import { KeysAPI } from "../api/v1/KeysAPI";
import { ERRORS, ErrorUtils } from "../ui/ErrorUtils";
import { TexterifyModal } from "../ui/TexterifyModal";
import { TranslationCard } from "../sites/dashboard/editor/TranslationCard";
import { APIUtils } from "../api/v1/APIUtils";
import FlagIcon from "../ui/FlagIcons";
import { TranslationsAPI } from "../api/v1/TranslationsAPI";
import { PermissionUtils } from "../utilities/PermissionUtils";
import { dashboardStore } from "../stores/DashboardStore";
import { FeatureNotAvailable } from "../ui/FeatureNotAvailable";

interface IProps {
    projectId: string;
    visible: boolean;
    languagesResponse: any;
    onCancelRequest(): void;
    onCreated?(): void;
}

interface IFormValues {
    name: string;
    description: string;
    htmlEnabled: boolean;
    defaultLanguageContent: string;
    defaultLanguageHTMLContent: string;
}

class NewKeyForm extends React.Component<IProps> {
    formRef = React.createRef<FormInstance>();

    handleSubmit = async (values: IFormValues) => {
        const response = await KeysAPI.createKey(
            this.props.projectId,
            values.name,
            values.description,
            values.htmlEnabled
        );

        if (response.errors) {
            if (ErrorUtils.hasError("name", ERRORS.TAKEN, response.errors)) {
                this.formRef.current.setFields([
                    {
                        name: "name",
                        errors: [ErrorUtils.getErrorMessage("name", ERRORS.TAKEN)]
                    }
                ]);
            } else {
                ErrorUtils.showErrors(response.errors);
            }

            return;
        }

        if (values.defaultLanguageContent || values.defaultLanguageHTMLContent) {
            const translationParams = {
                projectId: this.props.projectId,
                keyId: response.data.id,
                languageId: this.getDefaultLanguage().id
            };

            if (values.htmlEnabled) {
                await TranslationsAPI.createTranslation({
                    ...translationParams,
                    content: values.defaultLanguageHTMLContent
                });
            } else if (!values.htmlEnabled) {
                await TranslationsAPI.createTranslation({
                    ...translationParams,
                    content: values.defaultLanguageContent
                });
            }
        }

        if (this.props.onCreated) {
            this.props.onCreated();
        }
    };

    getDefaultLanguage = () => {
        return this.props.languagesResponse.data.find((language) => {
            return language.attributes.is_default;
        });
    };

    render() {
        const defaultLanguage = this.getDefaultLanguage();

        const countryCode = APIUtils.getIncludedObject(
            defaultLanguage?.relationships.country_code.data,
            this.props.languagesResponse.included
        );

        return (
            <TexterifyModal
                title="Add a new key"
                visible={this.props.visible}
                footer={
                    <div style={{ margin: "6px 0" }}>
                        <Button
                            onClick={() => {
                                this.props.onCancelRequest();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button form="newKeyForm" type="primary" htmlType="submit">
                            Create key
                        </Button>
                    </div>
                }
                onCancel={this.props.onCancelRequest}
            >
                <Form
                    ref={this.formRef}
                    id="newKeyForm"
                    onFinish={this.handleSubmit}
                    style={{ maxWidth: "100%" }}
                    initialValues={{ htmlEnabled: false }}
                >
                    <h3>Name *</h3>
                    <Form.Item
                        name="name"
                        rules={[{ required: true, whitespace: true, message: "Please enter the name of the key." }]}
                    >
                        <Input placeholder="Name" autoFocus />
                    </Form.Item>

                    <h3>Description</h3>
                    <Form.Item name="description" rules={[{ required: false }]}>
                        <Input placeholder="Description" />
                    </Form.Item>

                    <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue, setFieldsValue }) => {
                            return (
                                <>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <Form.Item
                                            name="htmlEnabled"
                                            rules={[{ required: false }]}
                                            valuePropName="checked"
                                            style={{ marginBottom: 0 }}
                                        >
                                            <Checkbox
                                                disabled={
                                                    !PermissionUtils.isDeveloperOrHigher(
                                                        dashboardStore.getCurrentRole()
                                                    ) || !dashboardStore.featureEnabled("FEATURE_HTML_EDITOR")
                                                }
                                            >
                                                HTML
                                            </Checkbox>
                                        </Form.Item>
                                        <Tooltip title="If checked a editor will be used for translation that helps you to create HTML content. You can always change this later.">
                                            <QuestionCircleOutlined />
                                        </Tooltip>
                                    </div>

                                    {!dashboardStore.featureEnabled("FEATURE_HTML_EDITOR") && (
                                        <FeatureNotAvailable
                                            feature="FEATURE_HTML_EDITOR"
                                            style={{ marginBottom: 0 }}
                                        />
                                    )}

                                    {defaultLanguage && (
                                        <>
                                            <h3 style={{ marginTop: 24 }}>
                                                {countryCode && (
                                                    <span style={{ marginRight: 8 }}>
                                                        <FlagIcon code={countryCode.attributes.code.toLowerCase()} />
                                                    </span>
                                                )}
                                                {defaultLanguage.attributes.name}
                                            </h3>
                                            {getFieldValue("htmlEnabled") ? (
                                                <Form.Item
                                                    name="defaultLanguageHTMLContent"
                                                    rules={[{ required: false }]}
                                                >
                                                    <TranslationCard
                                                        projectId={this.props.projectId}
                                                        languagesResponse={this.props.languagesResponse}
                                                        defaultSelected={defaultLanguage}
                                                        isHTMLKey
                                                        hideLanguageSelection
                                                        hideSaveButton
                                                        onChange={(_changed, content) => {
                                                            setFieldsValue({
                                                                defaultLanguageHTMLContent: content
                                                            });
                                                        }}
                                                        initialValue={getFieldValue("defaultLanguageHTMLContent")}
                                                    />
                                                </Form.Item>
                                            ) : (
                                                <Form.Item name="defaultLanguageContent" rules={[{ required: false }]}>
                                                    <Input.TextArea
                                                        style={{ resize: "none" }}
                                                        placeholder="Translation"
                                                        autoSize={{ minRows: 4, maxRows: 4 }}
                                                    />
                                                </Form.Item>
                                            )}
                                        </>
                                    )}
                                </>
                            );
                        }}
                    </Form.Item>
                </Form>
            </TexterifyModal>
        );
    }
}

export { NewKeyForm };
