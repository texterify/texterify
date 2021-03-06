import { Alert } from "antd";
import * as React from "react";
import { Link } from "react-router-dom";
import { Routes } from "../../routing/Routes";
import { ErrorSiteWrapper } from "../../ui/ErrorSiteWrapper";
import { SiteWrapperHeader } from "../../ui/SiteWrapperHeader";

export function InvalidAccountConfirmationLinkSite() {
    return (
        <ErrorSiteWrapper>
            <SiteWrapperHeader>Invalid account confirmation link</SiteWrapperHeader>

            <Alert showIcon message="The account confirmation link is invalid or has already been used." type="error" />

            <div style={{ marginTop: 16 }}>
                <Link to={Routes.AUTH.LOGIN}>Log in</Link>
            </div>
        </ErrorSiteWrapper>
    );
}
