package org.example.ai_backend.dto;

public class IssueResponse {

    private String issue;
    private String confidence_reason;
    private String priority;

    public IssueResponse() {
    }

    public IssueResponse(String issue, String confidence_reason, String priority) {
        this.issue = issue;
        this.confidence_reason = confidence_reason;
        this.priority = priority;
    }

    public String getIssue() {
        return issue;
    }

    public void setIssue(String issue) {
        this.issue = issue;
    }

    public String getConfidence_reason() {
        return confidence_reason;
    }

    public void setConfidence_reason(String confidence_reason) {
        this.confidence_reason = confidence_reason;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }
    @Override
    public String toString() {
        return issue + " "  + confidence_reason + " " + priority;
    }
}
