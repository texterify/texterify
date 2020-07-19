import { Button, Form, Input, Select, Tooltip } from "antd";
import { FormInstance } from "antd/lib/form";
import * as React from "react";
import { ErrorUtils } from "../ui/ErrorUtils";
import { TexterifyModal } from "../ui/TexterifyModal";
import { PostProcessingRulesAPI } from "../api/v1/PostProcessingRulesAPI";
import { ExportConfigsAPI } from "../api/v1/ExportConfigsAPI";
import { QuestionCircleOutlined } from "@ant-design/icons";

interface IProps {
    ruleToEdit?: any;
    projectId: string;
    visible: boolean;
    onCancelRequest();
    onCreated?(): void;
}

interface IState {
    responseExportConfigs: any;
}

interface IFormValues {
    name: string;
    searchFor: string;
    replaceWith: string;
}

class AddEditPostProcessingRuleForm extends React.Component<IProps> {
    formRef = React.createRef<FormInstance>();

    state: IState = {
        responseExportConfigs: null
    };

    async componentDidMount() {
        try {
            const responseExportConfigs = await ExportConfigsAPI.getExportConfigs({
                projectId: this.props.projectId
            });

            this.setState({
                responseExportConfigs
            });
        } catch (error) {
            console.error(error);
        }
    }

    handleSubmit = async (values: IFormValues) => {
        let response;

        if (this.props.ruleToEdit) {
            response = await PostProcessingRulesAPI.updatePostProcessingRule({
                projectId: this.props.projectId,
                ruleId: this.props.ruleToEdit.id,
                name: values.name,
                searchFor: values.searchFor,
                replaceWith: values.replaceWith
            });
        } else {
            response = await PostProcessingRulesAPI.createPostProcessingRule({
                projectId: this.props.projectId,
                name: values.name,
                searchFor: values.searchFor,
                replaceWith: values.replaceWith
            });
        }

        if (response.errors) {
            ErrorUtils.showErrors(response.errors);

            return;
        }

        if (this.props.onCreated) {
            this.props.onCreated();
        }
    };

    render() {
        return (
            <TexterifyModal
                title={this.props.ruleToEdit ? "Edit post processing rule" : "Add a new rule"}
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
                        <Button form="addEditPostProcessingRuleForm" type="primary" htmlType="submit">
                            {this.props.ruleToEdit ? "Save changes" : "Create rule"}
                        </Button>
                    </div>
                }
                onCancel={this.props.onCancelRequest}
            >
                <Form
                    ref={this.formRef}
                    onFinish={this.handleSubmit}
                    style={{ maxWidth: "100%" }}
                    id="addEditPostProcessingRuleForm"
                    initialValues={
                        this.props.ruleToEdit && {
                            name: this.props.ruleToEdit.attributes.name
                        }
                    }
                >
                    <h3>Name *</h3>
                    <Form.Item
                        name="name"
                        rules={[{ required: true, whitespace: true, message: "Please enter the name of the rule." }]}
                    >
                        <Input placeholder="Name" />
                    </Form.Item>

                    <h3>Rule *</h3>
                    <div style={{ display: "flex", lineHeight: "32px" }}>
                        Replace
                        <Form.Item
                            name="searchFor"
                            rules={[
                                {
                                    required: true,
                                    whitespace: true,
                                    message: "Please enter the text that should be replaced."
                                }
                            ]}
                            style={{ margin: "0 8px", flexGrow: 1, minHeight: 80, width: 200 }}
                        >
                            <Input placeholder="Text" />
                        </Form.Item>
                        with
                        <Form.Item
                            name="replaceWith"
                            rules={[
                                { required: true, whitespace: true, message: "Please enter the replacement text." }
                            ]}
                            style={{ margin: "0 0 0 8px", flexGrow: 1, minHeight: 80, width: 200 }}
                        >
                            <Input placeholder="Text" />
                        </Form.Item>
                    </div>

                    <h3>
                        Export config
                        <Tooltip title="If specified this rule only applies to exports of the selected configuration.">
                            <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                        </Tooltip>
                    </h3>
                    <Select
                        placeholder="Select a configuration"
                        style={{ width: "100%" }}
                        onChange={(value: string) => {
                            this.setState({ exportConfigId: value });
                        }}
                    >
                        {this.state.responseExportConfigs &&
                            this.state.responseExportConfigs.data.map((exportConfig) => {
                                return (
                                    <Select.Option value={exportConfig.id} key={exportConfig.id}>
                                        {exportConfig.attributes.name}
                                    </Select.Option>
                                );
                            })}
                    </Select>
                </Form>
            </TexterifyModal>
        );
    }
}

export { AddEditPostProcessingRuleForm };
