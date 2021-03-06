import { Button, Input, Layout, message, Modal, Select, Tag, Tooltip, Form, Table } from "antd";
import * as _ from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { RouteComponentProps } from "react-router";
import { MembersAPI } from "../../api/v1/MembersAPI";
import { ProjectsAPI } from "../../api/v1/ProjectsAPI";
import { Routes } from "../../routing/Routes";
import { authStore } from "../../stores/AuthStore";
import { dashboardStore } from "../../stores/DashboardStore";
import { Breadcrumbs } from "../../ui/Breadcrumbs";
import { Loading } from "../../ui/Loading";
import { UserAvatar } from "../../ui/UserAvatar";
import { PermissionUtils } from "../../utilities/PermissionUtils";
import { FormInstance } from "antd/lib/form";
import { ErrorUtils, ERRORS } from "../../ui/ErrorUtils";
import { RolesLegend } from "../../ui/RolesLegend";

type IProps = RouteComponentProps<{ projectId: string }>;
interface IState {
    userAddEmail: string;
    getMembersResponse: any;
    deleteDialogVisible: boolean;
    loading: boolean;
    search: string;
}

@observer
class MembersSite extends React.Component<IProps, IState> {
    formRef = React.createRef<FormInstance>();

    state: IState = {
        userAddEmail: "",
        getMembersResponse: null,
        deleteDialogVisible: false,
        loading: true,
        search: ""
    };

    debouncedSearchReloader = _.debounce(
        async (value) => {
            this.setState({ search: value });
            await this.reload(null, { search: value });
        },
        500,
        { trailing: true }
    );

    async componentDidMount() {
        await this.reload();
    }

    reload = async (userId?: string, options?: { search?: string }) => {
        this.setState({ loading: true });

        const fetchOptions = options || ({} as any);
        fetchOptions.search = (options && options.search) || this.state.search;

        try {
            const responseGetMembers = await MembersAPI.getMembers(this.props.match.params.projectId, fetchOptions);

            // If the current users permission changed we reload the current project.
            if (userId === authStore.currentUser.id) {
                const getProjectResponse = await ProjectsAPI.getProject(this.props.match.params.projectId);
                if (getProjectResponse.errors) {
                    this.props.history.push(Routes.DASHBOARD.PROJECTS);
                } else {
                    dashboardStore.currentProject = getProjectResponse.data;
                    dashboardStore.currentProjectIncluded = getProjectResponse.included;
                }
            }

            this.setState({
                getMembersResponse: responseGetMembers
            });
        } catch (e) {
            console.error(e);
        }

        this.setState({ loading: false });
    };

    getRows = () => {
        return this.state.getMembersResponse.data.map((member: any) => {
            return {
                id: member.id,
                key: member.id,
                username: member.attributes.username,
                email: member.attributes.email,
                role: member.attributes.role,
                roleSource: member.attributes.role_source
            };
        }, []);
    };

    getOrganizationRows = () => {
        return this.getRows().filter((member) => {
            return member.roleSource === "organization";
        });
    };

    getProjectRows = () => {
        return this.getRows().filter((member) => {
            return member.roleSource === "project";
        });
    };

    onRemove = async (item: any) => {
        this.setState({
            deleteDialogVisible: true
        });

        Modal.confirm({
            title:
                item.id === authStore.currentUser.id
                    ? "Do you really want to leave this project?"
                    : "Do you really want to remove this user from the project?",
            content: "This cannot be undone.",
            okText: "Yes",
            okButtonProps: {
                danger: true
            },
            cancelText: "No",
            autoFocusButton: "cancel",
            visible: this.state.deleteDialogVisible,
            onOk: async () => {
                try {
                    const deleteMemberResponse = await MembersAPI.deleteMember(
                        this.props.match.params.projectId,
                        item.key
                    );

                    if (item.email === authStore.currentUser.email) {
                        if (!deleteMemberResponse.errors) {
                            this.props.history.push(Routes.DASHBOARD.PROJECTS);
                        }
                    } else {
                        const getMembersResponse = await MembersAPI.getMembers(this.props.match.params.projectId);
                        this.setState({
                            getMembersResponse: getMembersResponse,
                            deleteDialogVisible: false
                        });
                    }
                } catch (error) {
                    message.error("Failed to remove user.");
                }
            },
            onCancel: () => {
                this.setState({
                    deleteDialogVisible: false
                });
            }
        });
    };

    hasOnlyOneOwner = () => {
        const ownerRows = this.getRows().filter((row) => {
            return PermissionUtils.isOwner(row.role);
        });

        return ownerRows.length === 1;
    };

    getColumns = () => {
        return [
            {
                title: "",
                key: "image",
                width: 80,
                render: (_text, record) => {
                    return <UserAvatar user={record} style={{ marginRight: 24 }} />;
                }
            },
            {
                title: "Username",
                key: "username",
                render: (_text, record) => {
                    return <span style={{ color: "var(--full-color)", fontWeight: "bold" }}>{record.username}</span>;
                }
            },
            {
                title: "E-Mail",
                key: "email",
                render: (_text, record) => {
                    return <span style={{ color: "var(--full-color)" }}>{record.email}</span>;
                }
            },
            {
                title: "Role",
                key: "role",
                render: (_text, record) => {
                    if (record.roleSource === "organization") {
                        return (
                            <Tooltip placement="left" title="Inherited from the organization.">
                                <Tag color={PermissionUtils.getColorByRole(record.role)}>
                                    {record.role.charAt(0).toUpperCase() + record.role.slice(1)}
                                </Tag>
                            </Tooltip>
                        );
                    }

                    return (
                        <Select
                            showSearch
                            placeholder="Select a role"
                            optionFilterProp="children"
                            filterOption
                            style={{ marginRight: 24, width: 240 }}
                            value={record.role}
                            onChange={async (value: string) => {
                                try {
                                    const response = await MembersAPI.updateMember(
                                        this.props.match.params.projectId,
                                        record.id,
                                        value
                                    );

                                    if (response.error) {
                                        if (response.message === "BASIC_PERMISSION_SYSTEM_FEATURE_NOT_AVAILABLE") {
                                            if (dashboardStore.currentOrganization) {
                                                ErrorUtils.showError(
                                                    "Please upgrade to a paid plan to add users to this project."
                                                );
                                            } else {
                                                ErrorUtils.showError(
                                                    "This feature is not available for private projects. Please move your project to an organization."
                                                );
                                            }
                                        } else if (response.message === "LAST_OWNER_CANT_BE_REMOVED") {
                                            message.error("The last user with an owner role can't be removed.");
                                        }
                                    } else {
                                        await this.reload(record.id);
                                        if (!response.errors) {
                                            message.success("User role updated successfully.");
                                        }
                                    }
                                } catch (e) {
                                    console.error(e);
                                    message.error("Error while updating user role.");
                                }
                            }}
                            disabled={
                                (!(
                                    PermissionUtils.isManagerOrHigher(dashboardStore.getCurrentRole()) &&
                                    PermissionUtils.isHigherRole(dashboardStore.getCurrentRole(), record.role)
                                ) &&
                                    !PermissionUtils.isOwner(dashboardStore.getCurrentRole())) ||
                                this.getRows().length === 1 ||
                                (PermissionUtils.isOwner(record.role) && this.hasOnlyOneOwner())
                            }
                        >
                            <Select.Option
                                value="translator"
                                disabled={!PermissionUtils.isHigherRole(dashboardStore.getCurrentRole(), "translator")}
                            >
                                Translator
                            </Select.Option>
                            <Select.Option
                                value="developer"
                                disabled={!PermissionUtils.isHigherRole(dashboardStore.getCurrentRole(), "developer")}
                            >
                                Developer
                            </Select.Option>
                            <Select.Option
                                value="manager"
                                disabled={!PermissionUtils.isHigherRole(dashboardStore.getCurrentRole(), "manager")}
                            >
                                Manager
                            </Select.Option>
                            <Select.Option
                                value="owner"
                                disabled={!PermissionUtils.isOwner(dashboardStore.getCurrentRole())}
                            >
                                Owner
                            </Select.Option>
                        </Select>
                    );
                }
            },
            {
                title: "",
                key: "actions",
                width: 80,
                render: (_text: any, record: any) => {
                    if (record.roleSource !== "organization") {
                        return (
                            <>
                                <Button
                                    style={{ width: "100%" }}
                                    onClick={async () => {
                                        await this.onRemove(record);
                                    }}
                                    danger
                                    disabled={
                                        (!PermissionUtils.isManagerOrHigher(dashboardStore.getCurrentRole()) &&
                                            !PermissionUtils.isHigherRole(
                                                dashboardStore.getCurrentRole(),
                                                record.role
                                            ) &&
                                            record.email !== authStore.currentUser.email) ||
                                        this.state.getMembersResponse?.data.length === 1
                                    }
                                >
                                    {record.id === authStore.currentUser.id ? "Leave" : "Remove"}
                                </Button>
                            </>
                        );
                    }
                }
            }
        ];
    };

    onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.debouncedSearchReloader(event.target.value);
    };

    render() {
        if (!this.state.getMembersResponse || !this.state.getMembersResponse.data) {
            return <Loading />;
        }

        return (
            <Layout style={{ padding: "0 24px 24px", margin: "0", width: "100%", maxWidth: 1200 }}>
                <Breadcrumbs breadcrumbName="projectMembers" />
                <Layout.Content style={{ margin: "24px 16px 0", minHeight: 360 }}>
                    <h1>Members</h1>
                    <p>Add users to your project.</p>
                    <div style={{ display: "flex", width: "100%" }}>
                        <Form ref={this.formRef} style={{ width: "100%", maxWidth: 480 }}>
                            <Form.Item name="name" style={{ marginBottom: 0 }}>
                                <Input
                                    placeholder="Enter users email address"
                                    onChange={async (event) => {
                                        this.setState({
                                            userAddEmail: event.target.value
                                        });
                                    }}
                                    value={this.state.userAddEmail}
                                    disabled={!PermissionUtils.isManagerOrHigher(dashboardStore.getCurrentRole())}
                                />
                            </Form.Item>
                        </Form>
                        <Button
                            style={{ marginLeft: 8 }}
                            type="primary"
                            onClick={async () => {
                                try {
                                    const createMemberResponse = await MembersAPI.createMember(
                                        this.props.match.params.projectId,
                                        this.state.userAddEmail
                                    );

                                    if (createMemberResponse.error) {
                                        if (
                                            createMemberResponse.message ===
                                            "BASIC_PERMISSION_SYSTEM_FEATURE_NOT_AVAILABLE"
                                        ) {
                                            if (dashboardStore.currentOrganization) {
                                                ErrorUtils.showError(
                                                    "Please upgrade to a paid plan to add users to this project."
                                                );
                                            } else {
                                                ErrorUtils.showError(
                                                    "This feature is not available for private projects. Please move your project to an organization."
                                                );
                                            }
                                        } else if (createMemberResponse.message === "USER_ALREADY_ADDED") {
                                            message.info("User has already been added to the project.");
                                        } else {
                                            ErrorUtils.showError("An unknown error occurred.");
                                        }
                                    } else if (createMemberResponse.errors) {
                                        this.formRef.current.setFields([
                                            {
                                                name: "name",
                                                errors: [
                                                    ErrorUtils.getErrorMessage("user with that email", ERRORS.NOT_FOUND)
                                                ]
                                            }
                                        ]);

                                        return;
                                    } else {
                                        this.formRef.current.resetFields();

                                        const getMembersResponse = await MembersAPI.getMembers(
                                            this.props.match.params.projectId
                                        );

                                        this.setState({
                                            getMembersResponse: getMembersResponse,
                                            userAddEmail: ""
                                        });
                                    }
                                } catch (error) {
                                    message.error("Failed to add user.");
                                }
                            }}
                            disabled={
                                this.state.userAddEmail === "" ||
                                !PermissionUtils.isManagerOrHigher(dashboardStore.getCurrentRole())
                            }
                        >
                            Invite
                        </Button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", marginTop: 24 }}>
                        <Input.Search
                            allowClear
                            placeholder="Search users"
                            onChange={this.onSearch}
                            style={{ maxWidth: "50%" }}
                        />

                        <RolesLegend style={{ marginLeft: "auto" }} />
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <h3>Project users</h3>
                        <Table
                            dataSource={this.getProjectRows()}
                            columns={this.getColumns()}
                            loading={this.state.loading}
                            pagination={false}
                        />
                    </div>

                    <div style={{ marginTop: 40 }}>
                        <h3>Users from organization</h3>
                        <Table
                            dataSource={this.getOrganizationRows()}
                            columns={this.getColumns()}
                            loading={this.state.loading}
                            pagination={false}
                        />
                    </div>
                </Layout.Content>
            </Layout>
        );
    }
}

export { MembersSite };
